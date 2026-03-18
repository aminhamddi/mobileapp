/**
 * Écran récapitulatif de l'audit
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import useAuditStore from '../store/useAuditStore';
import { createReponse, finalizeAudit } from '../services/api';
import { clearDraftReponses } from '../utils/storage';

const RecapScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);

    const currentAudit = useAuditStore((state) => state.currentAudit);
    const questions = useAuditStore((state) => state.questions);
    const reponses = useAuditStore((state) => state.reponses);
    const categories = useAuditStore((state) => state.categories);
    const gravites = useAuditStore((state) => state.gravites);
    const reset = useAuditStore((state) => state.reset);

    // Calculer statistiques
    const totalQuestions = questions.length;
    const reponsesArray = Object.values(reponses);
    const nbReponses = reponsesArray.length;
    const nbNA = reponsesArray.filter((r) => r.is_na).length;
    const nbNotees = nbReponses - nbNA;

    // Questions non répondues
    const questionsNonRepondues = questions.filter(
        (q) => !reponses[q.id]
    );

    // Calculer score approximatif
    const calculateScore = () => {
        const reponsesValides = reponsesArray.filter((r) => !r.is_na && r.note !== null);

        if (reponsesValides.length === 0) return 0;

        let totalPoints = 0;
        let totalPoids = 0;

        reponsesValides.forEach((reponse) => {
            const question = questions.find((q) => q.id === reponse.question_id);
            const gravite = gravites.find((g) => g.id === question?.gravite_id);

            if (gravite) {
                totalPoints += reponse.note * gravite.poids;
                totalPoids += gravite.poids * 5; // Max = 5
            }
        });

        return totalPoids > 0 ? (totalPoints / totalPoids) * 100 : 0;
    };

    const scoreGlobal = calculateScore();

    // Handler finaliser
    const handleFinalize = async () => {
        // Vérifier toutes réponses
        if (questionsNonRepondues.length > 0) {
            Alert.alert(
                'Audit incomplet',
                `Il reste ${questionsNonRepondues.length} question(s) non répondue(s). Voulez-vous quand même finaliser ?`,
                [
                    { text: 'Non', style: 'cancel' },
                    { text: 'Oui', onPress: submitAudit },
                ]
            );
            return;
        }

        submitAudit();
    };

    const submitAudit = async () => {
        if (!currentAudit) {
            Alert.alert('Erreur', 'Données de l\'audit introuvables. Veuillez recommencer.');
            return;
        }

        setLoading(true);

        try {
            // 1. Envoyer toutes les réponses au backend
            for (const reponse of reponsesArray) {
                await createReponse({
                    audit_id: currentAudit.id,
                    ...reponse,
                });
            }

            // 2. Finaliser l'audit
            await finalizeAudit(currentAudit.id);

            // 3. Clear draft 
            await clearDraftReponses(currentAudit.id);

            // 4. Reset store
            reset();

            // 5. Confirmation
            Alert.alert(
                'Audit finalisé !',
                `Score global : ${scoreGlobal.toFixed(1)}%\n${nbReponses} réponses enregistrées`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('Home'),
                    },
                ]
            );

        } catch (error) {
            console.error('Error finalizing audit:', error);
            Alert.alert('Erreur', 'Impossible de finaliser l\'audit');
        } finally {
            setLoading(false);
        }
    };

    // Grouper réponses par catégorie
    const reponsesByCategory = categories.map((cat) => {
        const questionsCategorie = questions.filter((q) => q.categorie_id === cat.id);
        const reponsesCategorie = questionsCategorie
            .map((q) => reponses[q.id])
            .filter(Boolean);

        return {
            categorie: cat,
            nbQuestions: questionsCategorie.length,
            nbReponses: reponsesCategorie.length,
            nbNA: reponsesCategorie.filter((r) => r.is_na).length,
        };
    });

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                {/* Header Score */}
                <View style={styles.scoreCard}>
                    <Text style={styles.scoreLabel}>Score Global</Text>
                    <Text style={styles.scoreValue}>{scoreGlobal.toFixed(1)}%</Text>
                    <Text style={styles.scoreSubtext}>Approximatif (calculé localement)</Text>
                </View>

                {/* Statistiques globales */}
                <View style={styles.statsCard}>
                    <Text style={styles.sectionTitle}>📊 Statistiques</Text>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Questions répondues :</Text>
                        <Text style={styles.statValue}>{nbReponses} / {totalQuestions}</Text>
                    </View>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Avec note :</Text>
                        <Text style={styles.statValue}>{nbNotees}</Text>
                    </View>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Non applicables (NA) :</Text>
                        <Text style={[styles.statValue, styles.naValue]}>{nbNA}</Text>
                    </View>

                    {questionsNonRepondues.length > 0 && (
                        <View style={[styles.statRow, styles.warningRow]}>
                            <Text style={styles.warningLabel}>⚠️ Non répondues :</Text>
                            <Text style={styles.warningValue}>{questionsNonRepondues.length}</Text>
                        </View>
                    )}
                </View>

                {/* Par catégorie */}
                <View style={styles.categoriesCard}>
                    <Text style={styles.sectionTitle}>📋 Par Catégorie</Text>

                    {Array.isArray(reponsesByCategory) && reponsesByCategory.map((item) => (
                        <View key={item.categorie?.id || Math.random()} style={styles.categoryRow}>
                            <View style={styles.categoryInfo}>
                                <Text style={styles.categoryName}>{item.categorie?.nom || 'Inconnu'}</Text>
                                <Text style={styles.categoryStats}>
                                    {item.nbReponses}/{item.nbQuestions} réponses
                                    {item.nbNA > 0 && ` (${item.nbNA} NA)`}
                                </Text>
                            </View>

                            <View style={styles.categoryProgress}>
                                <View
                                    style={[
                                        styles.categoryProgressFill,
                                        {
                                            width: `${(item.nbReponses / item.nbQuestions) * 100}%`,
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    ))}
                </View>

                {/* Questions NA */}
                {nbNA > 0 && (
                    <View style={styles.naCard}>
                        <Text style={styles.sectionTitle}>⊘ Questions Non Applicables</Text>

                        {reponsesArray
                            .filter((r) => r.is_na)
                            .map((reponse) => {
                                const question = questions.find((q) => q.id === reponse.question_id);
                                return (
                                    <View key={reponse.question_id} style={styles.naItem}>
                                        <Text style={styles.naQuestionNumber}>Q{question?.numero}</Text>
                                        <View style={styles.naQuestionInfo}>
                                            <Text style={styles.naQuestionText}>{question?.texte}</Text>
                                            {reponse.raison_na && (
                                                <Text style={styles.naRaison}>→ {reponse.raison_na}</Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                    </View>
                )}

                {/* Questions manquantes */}
                {questionsNonRepondues.length > 0 && (
                    <View style={styles.missingCard}>
                        <Text style={styles.sectionTitle}>⚠️ Questions Non Répondues</Text>

                        {questionsNonRepondues.slice(0, 5).map((question) => (
                            <View key={question.id} style={styles.missingItem}>
                                <Text style={styles.missingNumber}>Q{question.numero}</Text>
                                <Text style={styles.missingText}>{question.texte}</Text>
                            </View>
                        ))}

                        {questionsNonRepondues.length > 5 && (
                            <Text style={styles.moreText}>
                                ... et {questionsNonRepondues.length - 5} autres
                            </Text>
                        )}

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.backButtonText}>← Retour aux questions</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Footer Boutons */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => navigation.goBack()}
                    disabled={loading}
                >
                    <Text style={styles.cancelButtonText}>Retour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.finalizeButton, loading && styles.buttonDisabled]}
                    onPress={handleFinalize}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.finalizeButtonText}>✓ Finaliser l'audit</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
    },
    scoreCard: {
        backgroundColor: COLORS.primary,
        padding: 30,
        alignItems: 'center',
    },
    scoreLabel: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.9,
        marginBottom: 10,
    },
    scoreValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    scoreSubtext: {
        fontSize: 12,
        color: '#FFFFFF',
        opacity: 0.7,
        marginTop: 5,
    },
    statsCard: {
        backgroundColor: COLORS.surface,
        margin: 15,
        padding: 20,
        borderRadius: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    statLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    naValue: {
        color: COLORS.warning,
    },
    warningRow: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 10,
        borderRadius: 6,
        marginTop: 5,
    },
    warningLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.warning,
    },
    warningValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.warning,
    },
    categoriesCard: {
        backgroundColor: COLORS.surface,
        margin: 15,
        marginTop: 0,
        padding: 20,
        borderRadius: 12,
    },
    categoryRow: {
        marginBottom: 15,
    },
    categoryInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    categoryStats: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    categoryProgress: {
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    categoryProgressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    naCard: {
        backgroundColor: COLORS.surface,
        margin: 15,
        marginTop: 0,
        padding: 20,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.na,
    },
    naItem: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    naQuestionNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginRight: 10,
        minWidth: 30,
    },
    naQuestionInfo: {
        flex: 1,
    },
    naQuestionText: {
        fontSize: 13,
        color: COLORS.text,
        marginBottom: 5,
    },
    naRaison: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    missingCard: {
        backgroundColor: '#FFEBEE',
        margin: 15,
        marginTop: 0,
        padding: 20,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.danger,
    },
    missingItem: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    missingNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.danger,
        marginRight: 10,
        minWidth: 30,
    },
    missingText: {
        fontSize: 13,
        color: COLORS.text,
        flex: 1,
    },
    moreText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginTop: 5,
    },
    backButton: {
        marginTop: 15,
        padding: 12,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    finalizeButton: {
        backgroundColor: COLORS.success,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    finalizeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default RecapScreen;
