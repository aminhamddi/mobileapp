/**
 * Store global Zustand pour audit
 */
import { create } from 'zustand';

const useAuditStore = create((set, get) => ({
    // State
    user: null,
    currentAudit: null,
    questions: [],
    categories: [],
    gravites: [],
    reponses: {},
    currentQuestionIndex: 0,

    // Actions
    setUser: (user) => set({ user }),
    logout: () => set({ user: null, currentAudit: null, reponses: {}, currentQuestionIndex: 0 }),
    setCurrentAudit: (audit) => set({ currentAudit: audit }),

    setQuestions: (questions) => set({ questions }),

    setCategories: (categories) => set({ categories }),

    setGravites: (gravites) => set({ gravites }),

    setReponse: (questionId, reponse) => set((state) => ({
        reponses: {
            ...state.reponses,
            [questionId]: reponse,
        },
    })),

    nextQuestion: () => set((state) => ({
        currentQuestionIndex: Math.min(
            state.currentQuestionIndex + 1,
            state.questions.length - 1
        ),
    })),

    previousQuestion: () => set((state) => ({
        currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
    })),

    goToQuestion: (index) => set({ currentQuestionIndex: index }),

    getCurrentQuestion: () => {
        const { questions, currentQuestionIndex } = get();
        return questions[currentQuestionIndex];
    },

    getProgress: () => {
        const { questions, reponses } = get();
        const answered = Object.keys(reponses).length;
        return {
            answered,
            total: questions.length,
            percentage: (answered / questions.length) * 100,
        };
    },

    reset: () => set({
        currentAudit: null,
        reponses: {},
        currentQuestionIndex: 0,
    }),
}));

export default useAuditStore;