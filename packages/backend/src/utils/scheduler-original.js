// 05:00~10:00 깨우기
// 08:00~12:00 아침밥
// 13:00~16:00 점심밥
// 17:00~20:00 저녁밥
// 22:00~04:00 재우기

function getSchedIdx(hours) {
    if (hours >= 5 && hours < 12) {
        return 1
    } else if (hours >= 13 && hours < 16) {
        return 2
    } else if (hours >= 17 && hours < 20) {
        return 3
    } else if ((hours >= 22 && hours < 24) || 
        (hours >= 0 && hours < 4)) {
        return 4
    } else {
        return 0
    }
}

function getSchedule(req, date, temp, clearTempDate, initializer) {
    const cd = initializer();

    if (getSchedIdx(cd.getHours()) != getSchedIdx(date.getHours()) ||
        cd.getDate() != date.getDate() ||
        cd.getMonth() != date.getMonth() ||
        cd.getFullYear() != date.getFullYear()) {
        if (getSchedIdx(cd.getHours()) == 1) {
            if (temp) {
                if (temp.getDate() == cd.getDate() &&
                    temp.getMonth() == cd.getMonth() &&
                    temp.getFullYear() == cd.getFullYear()
                ) {
                    if (cd.getHours() >= 8 && cd.getHours() < 12) {
                        return {sched: "Eat", mealType: "Breakfast"}
                    } else {
                        return {sched: "Idle", mealType: undefined}
                    }
                } else {
                    clearTempDate(req);

                    if (cd.getHours() >= 5 && cd.getHours() < 10) {
                        return {sched: "WakeUp", mealType: undefined}
                    } else {
                        return {sched: "Eat", mealType: "Breakfast"}
                    }
                }
            } else {
                if (cd.getHours() >= 5 && cd.getHours() < 10) {
                    return {sched: "WakeUp", mealType: undefined}
                } else {
                    return {sched: "Eat", mealType: "Breakfast"}
                }
            }
        } else {
            if (getSchedIdx(cd.getHours()) == 0) {
                if (cd.getHours() >= 4 && cd.getHours() < 5) {
                    return {sched: "Night", mealType: undefined}
                } else {
                    return {sched: "Idle", mealType: undefined}
                }
            } else if (getSchedIdx(cd.getHours()) == 2) {
                return {sched: "Eat", mealType: "Lunch"}
            } else if (getSchedIdx(cd.getHours()) == 3) {
                return {sched: "Eat", mealType: "Dinner"}
            } else if (getSchedIdx(cd.getHours()) == 4) {
                if (date.getHours() >= 22 && date.getHours() < 24 &&
                    cd.getHours() >= 0 && cd.getHours() < 4 &&
                    cd.getTime() - date.getTime() < 1000 * 60 * 60 * 6) {
                    return {sched: "Night", mealType: undefined}
                } else {
                    return {sched: "Sleep", mealType: undefined}
                }
            }
        }
    } else {
        if (getSchedIdx(cd.getHours()) == 4) {
            if (date.getHours() >= 0 && date.getHours() < 4 &&
                cd.getHours() >= 22 && cd.getHours() < 24) {
                return {sched: "Sleep", mealType: undefined}
            } else {
                return {sched: "Night", mealType: undefined}
            }
        } else {
            return {sched: "Idle", mealType: undefined}
        }
        
    }
}

module.exports = { getSchedule }