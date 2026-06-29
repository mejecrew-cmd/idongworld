/**
 * packages/backend/scripts/migrate-dynamic-schema.mjs
 * ------------------------------------------------------------
 * 역할: users/hostStates/lodgeStates/myAidongStates의 기존 동적 데이터를
 * xlsx 정책 기반 split collection으로 idempotent하게 복사한다.
 *
 * 기본 실행은 dry-run이다. 실제 반영은 반드시 --commit을 붙인다.
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config({ path: '.env.local' })
dotenv.config()

const args = new Set(process.argv.slice(2))
const commit = args.has('--commit')
const localMongo = args.has('--local-mongo')

if (localMongo && !process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/idongworld'
}

function now() {
  return Date.now()
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string' && entry.length > 0) : []
}

function positiveInt(value, fallback = 0) {
  const parsed = Math.floor(Number(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function nonNegativeInt(value, fallback = 0) {
  const parsed = Math.floor(Number(value))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function normalized(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : undefined
}

function inventoryEntries(value) {
  return Object.entries(asObject(value))
    .map(([itemId, quantity]) => [itemId, nonNegativeInt(quantity, 0)])
    .filter(([itemId, quantity]) => itemId && quantity > 0)
}

function providerAccountId(uid, providerCode, providerSubjectId) {
  return `${uid}:${providerCode}:${providerSubjectId}`
}

function userInventoryItemId(uid, itemId) {
  return `${uid}:${itemId}`
}

function currencyBalanceId(uid, currencyId) {
  return `${uid}:${currencyId}`
}

function roomSlotId(uid, roomId) {
  return `${uid}:${roomId}`
}

function roomFurniturePlacementId(uid, roomId, placementIndex) {
  return `${uid}:${roomId}:${placementIndex}`
}

function mydongUid(uid, aidongId) {
  return `${uid}:${aidongId}`
}

function pediaInventoryId(uid, aidongId, pediaItemId) {
  return `${uid}:${mydongUid(uid, aidongId)}:${pediaItemId}`
}

function cosmeticInventoryId(uid, cosmeticId) {
  return `${uid}:${cosmeticId}`
}

function cosmeticLoadoutId(uid, ownedMydongUid) {
  return `${uid}:${ownedMydongUid}`
}

function metricBucket(metrics, collectionName) {
  metrics[collectionName] ??= { plannedInsert: 0, plannedUpdate: 0, inserted: 0, updated: 0, skipped: 0 }
  return metrics[collectionName]
}

async function upsertSetOnInsert(collection, filter, doc, metrics, collectionName) {
  const bucket = metricBucket(metrics, collectionName)
  if (!commit) {
    const exists = await collection.countDocuments(filter, { limit: 1 })
    if (exists) bucket.skipped += 1
    else bucket.plannedInsert += 1
    return
  }

  const result = await collection.updateOne(filter, { $setOnInsert: doc }, { upsert: true })
  if (result.upsertedCount) bucket.inserted += result.upsertedCount
  else bucket.skipped += 1
}

async function setMissingFields(collection, uid, patch, metrics) {
  const keys = Object.keys(patch)
  if (!keys.length) return
  const bucket = metricBucket(metrics, 'users')
  const filter = {
    uid,
    $or: keys.map((key) => ({ [key]: { $exists: false } })),
  }
  if (!commit) {
    const needsUpdate = await collection.countDocuments(filter, { limit: 1 })
    if (needsUpdate) bucket.plannedUpdate += 1
    else bucket.skipped += 1
    return
  }
  const result = await collection.updateOne(filter, { $set: patch })
  bucket.updated += result.modifiedCount
  if (!result.modifiedCount) bucket.skipped += 1
}

function buildProviderAccount(user, timestamp) {
  if (user.isGuest || user.authProvider === 'guest') return undefined
  if (user.loginIdNormalized || user.loginId) {
    const subject = user.loginIdNormalized ?? normalized(user.loginId)
    if (!subject) return undefined
    return {
      id: providerAccountId(user.uid, 'password', subject),
      uid: user.uid,
      providerCode: 'password',
      providerSubjectId: subject,
      email: user.email,
      emailNormalized: user.emailNormalized ?? normalized(user.email),
      emailVerified: Boolean(user.emailVerified),
      displayName: user.displayName,
      photoUrl: user.photoURL,
      linkedAt: user.createdAt ?? timestamp,
      lastLoginAt: user.lastLoginAt,
      status: 'active',
      createdAt: user.createdAt ?? timestamp,
      updatedAt: user.updatedAt ?? timestamp,
    }
  }

  const providerCode = user.authProvider
  const subject = user.providerUid ?? user.uid
  if (!providerCode || !subject) return undefined
  return {
    id: providerAccountId(user.uid, providerCode, subject),
    uid: user.uid,
    providerCode,
    providerSubjectId: subject,
    email: user.email,
    emailNormalized: user.emailNormalized ?? normalized(user.email),
    emailVerified: Boolean(user.emailVerified),
    displayName: user.displayName,
    photoUrl: user.photoURL,
    linkedAt: user.createdAt ?? timestamp,
    lastLoginAt: user.lastLoginAt,
    status: 'active',
    createdAt: user.createdAt ?? timestamp,
    updatedAt: user.updatedAt ?? timestamp,
  }
}

function buildUserSettings(user, timestamp) {
  const terms = asObject(user.termsAgreements)
  const sound = asObject(user.soundSettings)
  const termsCompleted = Boolean(user.termsCompleted)
  return {
    uid: user.uid,
    locale: user.locale,
    timeZone: user.timeZone,
    detectedTimeZone: user.detectedTimeZone,
    utcOffsetMinutes: user.utcOffsetMinutes,
    termsAccepted: termsCompleted,
    termsVersion: terms.serviceTermsVersion,
    termsAcceptedAt: terms.agreedAt,
    privacyAccepted: termsCompleted,
    privacyVersion: terms.privacyPolicyVersion,
    privacyAcceptedAt: terms.agreedAt,
    marketingAccepted: terms.marketingAccepted === true,
    pushNotificationAccepted: terms.pushNotificationAccepted === true,
    bgmVolume: nonNegativeInt(sound.bgmVolume, 100),
    sfxVolume: nonNegativeInt(sound.sfxVolume, 100),
    createdAt: user.createdAt ?? timestamp,
    updatedAt: user.updatedAt ?? timestamp,
  }
}

function roomMapFromLodge(lodge) {
  const rooms = asObject(lodge?.rooms)
  const furniture = asObject(lodge?.furniture)
  const result = {}
  for (const [roomId, room] of Object.entries(rooms)) {
    const roomObject = asObject(room)
    const roomFurniture = Array.isArray(roomObject.furniture)
      ? roomObject.furniture
      : Array.isArray(furniture[roomId])
        ? furniture[roomId]
        : []
    result[roomId] = roomFurniture.filter((itemId) => typeof itemId === 'string' && itemId.length > 0)
  }
  for (const [roomId, roomFurniture] of Object.entries(furniture)) {
    if (result[roomId]) continue
    result[roomId] = Array.isArray(roomFurniture)
      ? roomFurniture.filter((itemId) => typeof itemId === 'string' && itemId.length > 0)
      : []
  }
  return result
}

async function verifyUniqueIndexes(db) {
  const checks = [
    { collection: 'providerAccounts', fields: ['providerCode', 'providerSubjectId'] },
    { collection: 'userCurrencyBalances', fields: ['uid', 'currencyId'] },
    { collection: 'userInventoryItems', fields: ['uid', 'itemId'] },
    { collection: 'mydongList', fields: ['mydongUid'] },
    { collection: 'mydongPediaInventory', fields: ['uid', 'mydongUid', 'pediaItemId'] },
    { collection: 'userCosmeticInventory', fields: ['uid', 'cosmeticId'] },
    { collection: 'mydongCosmeticLoadouts', fields: ['uid', 'mydongUid'] },
  ]
  const failures = []
  for (const check of checks) {
    const collection = db.collection(check.collection)
    const groupId = Object.fromEntries(check.fields.map((field) => [field, `$${field}`]))
    const duplicates = await collection.aggregate([
      { $group: { _id: groupId, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 5 },
    ]).toArray()
    if (duplicates.length) failures.push({ ...check, duplicates })
  }
  return failures
}

async function main() {
  const uri = process.env.MONGO_URI?.trim()
  if (!uri) throw new Error('MONGO_URI is required for dynamic schema migration')

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? 5000),
  })

  const db = mongoose.connection.db
  if (!db) throw new Error('mongo db handle unavailable')

  const collections = {
    users: db.collection('users'),
    hostStates: db.collection('hostStates'),
    lodgeStates: db.collection('lodgeStates'),
    myAidongStates: db.collection('myAidongStates'),
    providerAccounts: db.collection('providerAccounts'),
    userSettings: db.collection('userSettings'),
    userCurrencyBalances: db.collection('userCurrencyBalances'),
    diceResources: db.collection('diceResources'),
    userInventoryItems: db.collection('userInventoryItems'),
    sooksoStates: db.collection('sooksoStates'),
    roomSlots: db.collection('roomSlots'),
    roomFurniturePlacements: db.collection('roomFurniturePlacements'),
    mydongList: db.collection('mydongList'),
    mydongPediaInventory: db.collection('mydongPediaInventory'),
    userCosmeticInventory: db.collection('userCosmeticInventory'),
    mydongCosmeticLoadouts: db.collection('mydongCosmeticLoadouts'),
  }

  const metrics = {}
  const users = await collections.users.find({}).toArray()
  const hosts = new Map((await collections.hostStates.find({}).toArray()).map((doc) => [doc.uid, doc]))
  const lodges = new Map((await collections.lodgeStates.find({}).toArray()).map((doc) => [doc.uid, doc]))
  const myAidongs = new Map((await collections.myAidongStates.find({}).toArray()).map((doc) => [doc.uid, doc]))
  const timestamp = now()

  for (const user of users) {
    const uid = user.uid
    if (!uid) continue
    const host = hosts.get(uid) ?? {}
    const lodge = lodges.get(uid)
    const myAidong = myAidongs.get(uid) ?? {}
    const createdAt = user.createdAt ?? timestamp
    const updatedAt = user.updatedAt ?? timestamp

    await setMissingFields(collections.users, uid, {
      status: user.status ?? 'active',
      lastLoginAt: user.lastLoginAt ?? updatedAt,
      lastLoginProvider: user.lastLoginProvider ?? user.authProvider,
    }, metrics)

    const providerAccount = buildProviderAccount(user, timestamp)
    if (providerAccount) {
      await upsertSetOnInsert(
        collections.providerAccounts,
        { providerCode: providerAccount.providerCode, providerSubjectId: providerAccount.providerSubjectId },
        providerAccount,
        metrics,
        'providerAccounts',
      )
    }

    await upsertSetOnInsert(
      collections.userSettings,
      { uid },
      buildUserSettings(user, timestamp),
      metrics,
      'userSettings',
    )

    const coin = nonNegativeInt(host.coins ?? user.coins, 100)
    const diamond = nonNegativeInt(host.diamonds ?? user.diamonds, 0)
    for (const [currencyId, balance] of [['coin', coin], ['diamond', diamond]]) {
      await upsertSetOnInsert(
        collections.userCurrencyBalances,
        { uid, currencyId },
        {
          id: currencyBalanceId(uid, currencyId),
          uid,
          currencyId,
          balance,
          createdAt,
          updatedAt,
        },
        metrics,
        'userCurrencyBalances',
      )
    }

    await upsertSetOnInsert(
      collections.diceResources,
      { uid },
      {
        uid,
        diceQuantity: nonNegativeInt(host.diceCount ?? user.diceCount, 6),
        maxDiceQuantity: 6,
        chargeIntervalMinutes: 60,
        dailyRollCount: 0,
        createdAt,
        updatedAt,
      },
      metrics,
      'diceResources',
    )

    const inventory = Object.keys(asObject(host.inventory)).length ? host.inventory : user.inventory
    for (const [itemId, quantity] of inventoryEntries(inventory)) {
      await upsertSetOnInsert(
        collections.userInventoryItems,
        { uid, itemId },
        {
          id: userInventoryItemId(uid, itemId),
          uid,
          itemId,
          quantity,
          acquiredAt: createdAt,
          createdAt,
          updatedAt,
        },
        metrics,
        'userInventoryItems',
      )
    }

    await upsertSetOnInsert(
      collections.sooksoStates,
      { uid },
      {
        uid,
        sooksoName: user.sooksoName,
        sooksoClean: Boolean(user.sooksoClean),
        createdAt,
        updatedAt,
      },
      metrics,
      'sooksoStates',
    )

    const assignedAidongs = asArray(lodge?.assignedAidongs)
    for (const aidongId of assignedAidongs) {
      await upsertSetOnInsert(
        collections.roomSlots,
        { uid, roomId: aidongId },
        {
          id: roomSlotId(uid, aidongId),
          uid,
          roomId: aidongId,
          mydongUid: mydongUid(uid, aidongId),
          aidongId,
          state: 'assigned',
          createdAt,
          updatedAt,
        },
        metrics,
        'roomSlots',
      )
    }

    const roomFurnitureMap = roomMapFromLodge(lodge)
    for (const [roomId, furniture] of Object.entries(roomFurnitureMap)) {
      for (let placementIndex = 0; placementIndex < furniture.length; placementIndex += 1) {
        const itemId = furniture[placementIndex]
        await upsertSetOnInsert(
          collections.roomFurniturePlacements,
          { uid, roomId, placementIndex },
          {
            id: roomFurniturePlacementId(uid, roomId, placementIndex),
            uid,
            roomId,
            itemId,
            placementIndex,
            placedAt: createdAt,
            updatedAt,
          },
          metrics,
          'roomFurniturePlacements',
        )
      }
    }

    const recruitedAidongs = asArray(myAidong.recruitedAidongs).length
      ? asArray(myAidong.recruitedAidongs)
      : asArray(user.recruitedAidongs)
    for (const aidongId of recruitedAidongs) {
      await upsertSetOnInsert(
        collections.mydongList,
        { mydongUid: mydongUid(uid, aidongId) },
        {
          mydongUid: mydongUid(uid, aidongId),
          uid,
          aidongId,
          acquiredAt: createdAt,
          acquisitionSource: 'migration',
          favoriteLevel: 0,
          status: 'active',
          createdAt,
          updatedAt,
        },
        metrics,
        'mydongList',
      )
    }

    const codexItems = asObject(myAidong.aidongCodexItems)
    for (const [aidongId, items] of Object.entries(codexItems)) {
      const entries = inventoryEntries(items)
      for (let index = 0; index < entries.length; index += 1) {
        const [pediaItemId, quantity] = entries[index]
        await upsertSetOnInsert(
          collections.mydongPediaInventory,
          { uid, mydongUid: mydongUid(uid, aidongId), pediaItemId },
          {
            id: pediaInventoryId(uid, aidongId, pediaItemId),
            uid,
            mydongUid: mydongUid(uid, aidongId),
            aidongId,
            pediaItemId,
            slotNo: index + 1,
            quantity,
            maxQuantity: 999,
            firstAcquiredAt: createdAt,
            lastAcquiredAt: updatedAt,
            source: 'migration',
            updatedAt,
          },
          metrics,
          'mydongPediaInventory',
        )
      }
    }

    const equippedOutfit = asObject(myAidong.equippedOutfit)
    const equippedItems = asObject(myAidong.equippedItems)
    for (const aidongId of new Set([...Object.keys(equippedOutfit), ...Object.keys(equippedItems)])) {
      const outfitId = typeof equippedOutfit[aidongId] === 'string' ? equippedOutfit[aidongId] : undefined
      const itemIds = asArray(equippedItems[aidongId])
      const ownedMydongUid = mydongUid(uid, aidongId)
      await upsertSetOnInsert(
        collections.mydongCosmeticLoadouts,
        { uid, mydongUid: ownedMydongUid },
        {
          id: cosmeticLoadoutId(uid, ownedMydongUid),
          uid,
          mydongUid: ownedMydongUid,
          aidongId,
          outfitId,
          equippedItemIds: itemIds,
          updatedAt,
        },
        metrics,
        'mydongCosmeticLoadouts',
      )
      for (const cosmeticId of [outfitId, ...itemIds].filter(Boolean)) {
        await upsertSetOnInsert(
          collections.userCosmeticInventory,
          { uid, cosmeticId },
          {
            id: cosmeticInventoryId(uid, cosmeticId),
            uid,
            cosmeticId,
            quantity: 1,
            source: 'migration-equipped',
            acquiredAt: createdAt,
            updatedAt,
          },
          metrics,
          'userCosmeticInventory',
        )
      }
    }
  }

  const duplicateFailures = await verifyUniqueIndexes(db)
  const collectionCounts = {}
  for (const collectionName of [
    'providerAccounts',
    'userSettings',
    'userCurrencyBalances',
    'diceResources',
    'userInventoryItems',
    'sooksoStates',
    'roomSlots',
    'roomFurniturePlacements',
    'mydongList',
    'mydongPediaInventory',
    'userCosmeticInventory',
    'mydongCosmeticLoadouts',
  ]) {
    collectionCounts[collectionName] = await db.collection(collectionName).countDocuments()
  }

  console.log(JSON.stringify({
    ok: duplicateFailures.length === 0,
    mode: commit ? 'commit' : 'dry-run',
    userCount: users.length,
    metrics,
    collectionCounts,
    duplicateFailures,
  }, null, 2))

  if (duplicateFailures.length) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined)
  })
