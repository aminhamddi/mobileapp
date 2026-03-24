/**
 * Écran sélection service — un seul audit, les services sont des groupes de navigation
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { createAudit, getServicesWithQuestions } from '../services/api';
import useAuditStore from '../store/useAuditStore';

const ServiceSelectionScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [servicesData, setServicesData] = useState([]);
    const [expandedService, setExpandedService] = useState(null);

    const user = useAuditStore((state) => state.user);
    const allQuestions = useAuditStore((state) => state.questions);
    const setCurrentAudit = useAuditStore((state) => state.setCurrentAudit);
    const reset = useAuditStore((state) => state.reset);

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            const data = await getServicesWithQuestions();
            setServicesData(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur chargement services:', error);
            Alert.alert('Erreur', 'Impossible de charger les services');
        }
    };

    const toggleExpand = (serviceId) => {
        setExpandedService(expandedService === serviceId ? null : serviceId);
    };

    const handleStartAudit = async () => {
        setLoading(true);
        try {
            reset();

            const auditData = {
                plant_id: user.plant_id,
                service_id: null,
                date_audit: new Date().toISOString().split('T')[0],
                heure_debut: new Date().toTimeString().split(' ')[0],
            };

            const audit = await createAudit(auditData);
            setCurrentAudit(audit);

            // All questions, sorted by numero
            const sorted = [...allQuestions].sort((a, b) => a.numero - b.numero);
            // setQuestions is already done in HomeScreen, all questions stay

            navigation.navigate('Question', { startServiceId: null });

        } catch (error) {
            console.error('Error creating audit:', error);
            Alert.alert(
                'Erreur',
                'Impossible de créer l\'audit: ' + (error.response?.data?.detail || error.message)
            );
        } finally {
            setLoading(false);
        }
    };

    const handleJumpToService = (service) => {
        // Jump to first question of this service group
        const firstQuestion = allQuestions
            .filter(q => q.services && q.services.some(s => s.id === service.id))
            .sort((a, b) => a.numero - b.numero)[0];

        if (!firstQuestion) {
            Alert.alert('Attention', 'Aucune question pour ce service');
            return;
        }

        const index = allQuestions
            .sort((a, b) => a.numero - b.numero)
            .findIndex(q => q.id === firstQuestion.id);

        navigation.navigate('Question', {
            startServiceId: service.id,
            startQuestionIndex: index >= 0 ? index : 0,
        });
    };

    const getServiceColor = (index) => {
        const colors = ['#1976D2', '#E91E63', '#FF9800', '#4CAF50', '#9C27B0', '#00BCD4', '#F44336'];
        return colors[index % colors.length];
    };

    if (servicesData.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Chargement des services...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                <Text style={styles.title}>Nouvel Audit</Text>
                <Text style={styles.subtitle}>
                    Choisissez par quel service commencer
                </Text>

                {servicesData.map((service, index) => {
                    const isExpanded = expandedService === service.id;
                    const questionCount = service.questions?.length || 0;
                    const color = getServiceColor(index);

                    return (
                        <View key={service.id} style={styles.serviceBlock}>
                            <TouchableOpacity
                                style={[styles.serviceCard, { borderLeftColor: color }]}
                                onPress={() => {
                                    toggleExpand(service.id);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.serviceHeader}>
                                    <View style={[styles.serviceIcon, { backgroundColor: color + '20' }]}>
                                        <Text style={[styles.serviceIconText, { color }]}>
                                            {service.nom.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.serviceInfo}>
                                        <Text style={styles.serviceName}>{service.nom}</Text>
                                        <Text style={styles.questionCount}>
                                            {questionCount} question{questionCount !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                    <Text style={styles.expandIcon}>
                                        {isExpanded ? '▲' : '▼'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {isExpanded && service.questions && service.questions.length > 0 && (
                                <View style={styles.questionsContainer}>
                                    {service.questions.map((question) => (
                                        <View key={question.id} style={styles.questionRow}>
                                            <Text style={[styles.questionNumber, { color }]}>
                                                Q{question.numero}
                                            </Text>
                                            <Text style={styles.questionText} numberOfLines={2}>
                                                {question.texte}
                                            </Text>
                                        </View>
                                    ))}

                                    <TouchableOpacity
                                        style={[styles.startButton, { backgroundColor: color }]}
                                        onPress={() => handleJumpToService(service)}
                                    >
                                        <Text style={styles.startButtonText}>
                                            Commencer par {service.nom}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Bouton démarrer global */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.mainButton, loading && styles.mainButtonDisabled]}
                    onPress={handleStartAudit}
                    disabled={loading}
                >
                    <Text style={styles.mainButtonText}>
                        {loading ? 'Création...' : `Démarrer l'audit (${allQuestions.length} questions)`}
                    </Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 20,
    },
    serviceBlock: {
        marginBottom: 12,
    },
    serviceCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    serviceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    serviceIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    serviceIconText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    questionCount: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    expandIcon: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    questionsContainer: {
        backgroundColor: '#FAFAFA',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginLeft: 16,
        borderLeftWidth: 2,
        borderLeftColor: '#E0E0E0',
    },
    questionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    questionNumber: {
        fontSize: 13,
        fontWeight: '700',
        width: 36,
        marginTop: 1,
    },
    questionText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.text,
        lineHeight: 18,
    },
    startButton: {
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 4,
    },
    startButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    footer: {
        padding: 16,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    mainButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    mainButtonDisabled: {
        opacity: 0.5,
    },
    mainButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ServiceSelectionScreen;
