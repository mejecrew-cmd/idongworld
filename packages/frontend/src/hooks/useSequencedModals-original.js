import { useCallback } from 'react';
import api from '../utils/API';
import { useModals } from '../contexts/ModalsContext';

export const useSequencedModals = () => {
    const { modals, openModal, closeModal } = useModals();

    const openTutorial = useCallback(async (idx) => {
        const result = (await api.getTutorials()).data;
        const tutorials = result.tutorials;
        if (tutorials[7] && !tutorials[idx]) {
            openModal('tutorial', { idx });
        } else if (tutorials[7] && !tutorials[4]) {
            openModal('tutorial', { idx: 4 });
        }
    }, [openModal]);

    const openPopup = useCallback(async () => {
        const popups = (await api.getPopups()).data.popups;
        const tutorials = (await api.getTutorials()).data.tutorials;
        const tincasePopup = (await api.getTincasePopup()).data.popup;
        const plusPopup = (await api.getPlusPopup()).data.popup;
        const lastPopup = (await api.getLastPopup()).data.popup;

        // Sequence priority logic
        if (popups[0]) openModal('popup', { idx: 0 });
        else if (popups[1]) openModal('popup', { idx: 1 });
        else if (popups[2]) openModal('popup', { idx: 2 });
        else if (popups[3]) openModal('popup', { idx: 3 });
        else if (popups[4]) openModal('popup', { idx: 4 });
        else if (popups[5]) openModal('popup', { idx: 5 });
        else if (popups[6]) openModal('popup', { idx: 6 });
        else if (popups[7]) openModal('popup', { idx: 7 });
        else if (popups[26]) openModal('popup', { idx: 26 });
        else if (popups[8]) openModal('popup', { idx: 8 });
        else if (popups[9]) openModal('popup', { idx: 9 });
        else if (popups[10]) openModal('popup', { idx: 10 });
        else if (popups[11]) openModal('popup', { idx: 11 });
        else if (popups[12]) openModal('popup', { idx: 12 });
        else if (popups[13]) openModal('popup', { idx: 13 });
        else if (popups[14]) openModal('popup', { idx: 14 });
        else if (popups[15]) openModal('popup', { idx: 15 });
        else if (popups[16]) openModal('popup', { idx: 16 });
        else if (popups[17]) openModal('popup', { idx: 17 });
        else if (popups[18]) openModal('popup', { idx: 18 });
        else if (popups[19]) openModal('popup', { idx: 19 });
        else if (popups[20]) openModal('popup', { idx: 20 });
        else if (popups[21]) openModal('popup', { idx: 21 });
        else if (popups[22]) openModal('popup', { idx: 22 });
        else if (popups[23]) openModal('popup', { idx: 23 });
        else if (popups[24]) openModal('popup', { idx: 24 });
        else if (popups[25]) openModal('popup', { idx: 25 });
        else if (tincasePopup) openModal('popup', { idx: 101 });
        else if (plusPopup) openModal('popup', { idx: 102 });
        else if (lastPopup) openModal('popup', { idx: 103 });
        else openTutorial(0);
    }, [openModal, openTutorial]);

    const closePopup = useCallback(async () => {
        const prevIdx = modals.popup.idx;
        if (prevIdx < 100) await api.postSetPopups(prevIdx);
        else if (prevIdx === 101) await api.postSetTincasePolup();
        else if (prevIdx === 102) await api.postSetPlusPopup();
        else if (prevIdx === 103) await api.postSetLastPopup();
        closeModal('popup');
        openPopup();
    }, [modals.popup.idx, closeModal, openPopup]);

    const closeTutorial = useCallback(async () => {
        const prevIdx = modals.tutorial.idx;
        await api.postSetTutorials(prevIdx);
        closeModal('tutorial');

        const tutorials = (await api.getTutorials()).data.tutorials;
        if (!tutorials[4]) {
            openModal('tutorial', { idx: 4 });
        } else if (prevIdx === 3 || (prevIdx === 4 && tutorials[3])) {
            openPopup();
        }   
    }, [modals.tutorial.idx, closeModal, openPopup]);

    return {
        openPopup,
        closePopup,
        openTutorial,
        closeTutorial
    };
};
