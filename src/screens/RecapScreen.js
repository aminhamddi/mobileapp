/**
 * Écran récapitulatif de l'audit — compatible web + native
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
    Platform,
    Modal,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { isWeb } from '../utils/responsive';
import useAuditStore from '../store/useAuditStore';
import { createReponse, finalizeAudit, saveAuditResponses, getReponsesByAudit } from '../services/api';
import { clearDraftReponses } from '../utils/storage';


const RecapScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [saveModalVisible, setSaveModalVisible] = useState(false);

    const currentAudit = useAuditStore((state) => state.currentAudit);
    const questions = useAuditStore((state) => state.questions);
    const reponses = useAuditStore((state) => state.reponses);
    const setAllReponses = useAuditStore((state) => state.setAllReponses);
    const categories = useAuditStore((state) => state.categories);
    const gravites = useAuditStore((state) => state.gravites);
    const reset = useAuditStore((state) => state.reset);
    
    // DEBUG: Log des reponses au changement
    React.useEffect(() => {
    }, [reponses]);

    // Fetch responses on mount
    React.useEffect(() => {
        if (currentAudit) {
            const fetchReponses = async () => {
                try {
                    const data = await getReponsesByAudit(currentAudit.id);
                    
                    // NE METTRE À JOUR QUE SI LE STORE EST VIDE
                    if (data.length > 0 && Object.keys(reponses).length === 0) {
                        const responseMap = data.reduce((acc, r) => ({ ...acc, [r.question_id]: r }), {});
                        setAllReponses(responseMap);
                    }
                } catch (e) {
                    console.error("Error fetching responses:", e);
                }
            };
            fetchReponses();
        }
    }, [currentAudit]);

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

    // Show confirmation and navigate to Home
    const showSuccessAndNavigate = (message) => {
        if (Platform.OS === 'web') {
            window.alert(message);
            navigation.navigate('Home');
        } else {
            Alert.alert('Audit finalisé !', message, [
                { text: 'OK', onPress: () => navigation.navigate('Home') },
            ]);
        }
    };

    // Handler finaliser
    const handleFinalize = async () => {
        // Bloquer si questions non repondues
        if (questionsNonRepondues.length > 0) {
            const msg = 'Il reste ' + questionsNonRepondues.length + ' question(s) non repondue(s). Veuillez toutes les repondre avant de finaliser.';
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert('Audit incomplet', msg);
            }
            return;
        }

        submitAudit();
    };

    const saveOnly = async () => {
        try {
            const responsesToSave = reponsesArray.map((r) => ({
                audit_id: currentAudit.id,
                ...r
            }));
            await saveAuditResponses(currentAudit.id, responsesToSave);
            return true;
        } catch (e) {
            console.error('Erreur sauvegarde:', e);
            Alert.alert('Erreur', 'Impossible de sauvegarder.');
            return false;
        }
    };

    const handleSaveAndExit = async () => {
        setLoading(true);
        const success = await saveOnly();
        setLoading(false);
        if (success) {
            setSaveModalVisible(false);
            navigation.navigate('Home');
        }
    };


    const submitAudit = async () => {
        if (!currentAudit) {
            const msg = 'Données de l\'audit introuvables. Veuillez recommencer.';
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Erreur', msg);
            return;
        }

        setLoading(true);

        try {
            // 1. Envoyer toutes les réponses en un seul lot (BATCH) au lieu d'une boucle
            // C'est beaucoup plus robuste et rapide
            const responsesToSave = reponsesArray.map((r) => ({
                audit_id: currentAudit.id,
                question_id: r.question_id,
                note: r.note,
                is_na: r.is_na,
                raison_na: r.raison_na,
                deviation: r.deviation,
                designation: r.designation,
                commentaire: r.commentaire,
                photos: r.photos || [],
            }));

            await saveAuditResponses(currentAudit.id, responsesToSave);

            // 2. Finaliser l'audit (déclenche calculs scores + génération IA)
            await finalizeAudit(currentAudit.id);

            // 3. Nettoyage local
            await clearDraftReponses(currentAudit.id);
            reset();

            // 4. Confirmation
            showSuccessAndNavigate(
                `Score global : ${scoreGlobal.toFixed(1)}%\n${nbReponses} réponses enregistrées`
            );

        } catch (error) {
            console.error('Error finalizing audit:', error);
            const errorMsg = error.response?.data?.detail || 'Impossible de finaliser l\'audit. Vérifiez votre connexion.';
            if (Platform.OS === 'web') {
                window.alert(errorMsg);
            } else {
                Alert.alert('Erreur', errorMsg);
            }
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
                    <Text style={styles.cancelButtonText} numberOfLines={1} adjustsFontSizeToFit>Retour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={() => setSaveModalVisible(true)}
                    disabled={loading}
                >
                    <Text style={styles.saveButtonText} numberOfLines={1} adjustsFontSizeToFit>Sauvegarder</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.finalizeButton, loading && styles.buttonDisabled]}
                    onPress={handleFinalize}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.finalizeButtonText} numberOfLines={1} adjustsFontSizeToFit>✓ Finaliser</Text>
                    )}
                </TouchableOpacity>
            </View>
            <Modal visible={saveModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Sauvegarde</Text>
                        <Text style={styles.modalText}>Que voulez-vous faire ?</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={handleSaveAndExit}>
                            <Text style={styles.modalButtonText}>Sauvegarder et quitter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, {backgroundColor: COLORS.primary}]} onPress={async () => { await saveOnly(); setSaveModalVisible(false); }}>
                            <Text style={[styles.modalButtonText, {color: '#FFFFFF'}]}>Sauvegarder et rester</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, {backgroundColor: COLORS.background}]} onPress={() => setSaveModalVisible(false)}>
                            <Text style={styles.modalButtonText}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        padding: 20,
        ...(isWeb && {
            maxWidth: 800,
            alignSelf: 'center',
            width: '100%',
        }),
    },
    footer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        ...(isWeb && {
            maxWidth: 800,
            alignSelf: 'center',
            width: '100%',
            borderRadius: 12,
            marginBottom: 20,
            borderTopWidth: 0,
        }),
    },

    footer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        ...(isWeb && {
            maxWidth: 800,
            alignSelf: 'center',
            width: '100%',
            borderRadius: 12,
            marginBottom: 20,
            borderTopWidth: 0,
        }),
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
        padding: 10,
        borderRadius: 8,
        marginHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    saveButton: {
        backgroundColor: '#FFEB3B',
    },
    finalizeButton: {
        backgroundColor: COLORS.success,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    cancelButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
    },
    saveButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
    },
    finalizeButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        ...(isWeb && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
        }),
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        width: '80%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalText: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButton: {
        padding: 12,
        width: '100%',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
});

export default RecapScreen;
