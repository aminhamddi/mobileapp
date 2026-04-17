/**
 * Store global Zustand pour audit — avec filtrage par service
 */
import { create } from 'zustand';

const useAuditStore = create((set, get) => ({
    // State
    user: null,
    currentAudit: null,
    currentProjectId: null, // Ajout du projet
    questions: [],
    categories: [],
    gravites: [],
    reponses: {},
    currentQuestionIndex: 0,

    // Service filtering state
    currentServiceId: null,
    filteredQuestions: [],

    // Actions
    setUser: (user) => set({ user }),
    logout: () => set({ user: null, currentAudit: null, currentProjectId: null, reponses: {}, currentQuestionIndex: 0, currentServiceId: null, filteredQuestions: [] }),
    setCurrentAudit: (audit) => set({ currentAudit: audit }),
    setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),

    setQuestions: (questions) => set({ questions }),
    setCategories: (categories) => set({ categories }),
    setGravites: (gravites) => set({ gravites }),

    // Set current service and filter questions
    setService: (serviceId) => {
        const { questions } = get();
        const filtered = questions
            .filter((q) => q.services && q.services.some((s) => s.id === serviceId))
            .sort((a, b) => a.numero - b.numero);
        set({
            currentServiceId: serviceId,
            filteredQuestions: filtered,
            currentQuestionIndex: 0,
        });
    },

    setReponse: (questionId, reponse) => set((state) => ({
        reponses: {
            ...state.reponses,
            [questionId]: reponse,
        },
    })),

    setAllReponses: (reponses) => set({ reponses }),

    nextQuestion: () => set((state) => ({
        currentQuestionIndex: Math.min(
            state.currentQuestionIndex + 1,
            state.filteredQuestions.length - 1
        ),
    })),

    previousQuestion: () => set((state) => ({
        currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
    })),

    goToQuestion: (index) => set({ currentQuestionIndex: index }),

    getCurrentQuestion: () => {
        const { filteredQuestions, currentQuestionIndex } = get();
        return filteredQuestions[currentQuestionIndex];
    },

    getProgress: () => {
        const { filteredQuestions, reponses } = get();
        const answered = filteredQuestions.filter((q) => reponses[q.id]).length;
        return {
            answered,
            total: filteredQuestions.length,
            percentage: filteredQuestions.length > 0
                ? (answered / filteredQuestions.length) * 100
                : 0,
        };
    },

    // Get progress for a specific service
    getServiceProgress: (serviceId) => {
        const { questions, reponses } = get();
        const serviceQuestions = questions.filter(
            (q) => q.services && q.services.some((s) => s.id === serviceId)
        );
        const answered = serviceQuestions.filter((q) => reponses[q.id]).length;
        return {
            answered,
            total: serviceQuestions.length,
            percentage: serviceQuestions.length > 0
                ? (answered / serviceQuestions.length) * 100
                : 0,
        };
    },

    reset: () => set({
        currentAudit: null,
        currentProjectId: null,
        reponses: {},
        currentQuestionIndex: 0,
        currentServiceId: null,
        filteredQuestions: [],
    }),
}));

export default useAuditStore;
