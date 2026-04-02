/**
 * Ecran selection service — avec progression par service
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { createAudit, getServicesWithQuestions } from '../services/api';
import useAuditStore from '../store/useAuditStore';

const ServiceSelectionScreen = ({ navigation }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    const user = useAuditStore((state) => state.user);
    const currentAudit = useAuditStore((state) => state.currentAudit);
    const setCurrentAudit = useAuditStore((state) => state.setCurrentAudit);
    const setService = useAuditStore((state) => state.setService);
    const getServiceProgress = useAuditStore((state) => state.getServiceProgress);

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            setLoading(true);
            const data = await getServicesWithQuestions();
            setServices(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur chargement services:', error);
            setServices([]);
            Alert.alert('Erreur', 'Impossible de charger les services');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectService = async (service) => {
        setLoading(true);
        try {
            // Create audit if not already created
            if (!currentAudit) {
                const auditData = {
                    plant_id: user?.plant_id || 1,
                    service_id: service.id,
                    date_audit: new Date().toISOString().split('T')[0],
                    heure_debut: new Date().toTimeString().split(' ')[0],
                };
                const audit = await createAudit(auditData);
                setCurrentAudit(audit);
            }
            setService(service.id);
            navigation.navigate('Question');
        } catch (error) {
            console.error('Erreur creation audit:', error);
            Alert.alert('Erreur', "Impossible de creer l'audit");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Chargement des services...</Text>
            </View>
        );
    }

    const serviceList = Array.isArray(services) ? services : [];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Choisir un service</Text>
                <Text style={styles.subtitle}>
                    Selectionnez le service avec lequel commencer l'audit
                </Text>

                {serviceList.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Aucun service disponible</Text>
                    </View>
                ) : (
                    serviceList.map((service) => {
                        const progress = getServiceProgress(service.id);
                        const isComplete = progress.total > 0 && progress.answered === progress.total;

                        return (
                            <TouchableOpacity
                                key={service.id}
                                style={[
                                    styles.serviceCard,
                                    isComplete && styles.serviceCardComplete,
                                ]}
                                onPress={() => handleSelectService(service)}
                            >
                                <View style={styles.serviceHeader}>
                                    <Text style={styles.serviceIcon}>
                                        {getIconForService(service.nom)}
                                    </Text>
                                    <View style={styles.serviceInfo}>
                                        <Text style={styles.serviceName}>{service.nom}</Text>
                                        <Text style={styles.serviceQuestions}>
                                            {progress.total} question{progress.total > 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.progressBadge}>
                                        <Text style={[
                                            styles.progressText,
                                            isComplete && styles.progressTextComplete,
                                        ]}>
                                            {progress.answered}/{progress.total}
                                        </Text>
                                        {isComplete && (
                                            <Text style={styles.checkmark}> OK</Text>
                                        )}
                                    </View>
                                </View>

                                {progress.total > 0 && (
                                    <View style={styles.progressBar}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    width: `${progress.percentage}%`,
                                                    backgroundColor: isComplete
                                                        ? '#4CAF50'
                                                        : COLORS.primary,
                                                },
                                            ]}
                                        />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
};

function getIconForService(nom) {
    switch (nom) {
        case 'Production': return 'P';
        case 'Maintenance': return 'M';
        case 'OEE': return 'O';
        case 'Formation': return 'F';
        case 'VCM': return 'V';
        case 'PE': return 'E';
        case 'QM': return 'Q';
        default: return 'S';
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 20,
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
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 24,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    serviceCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    serviceCardComplete: {
        borderColor: '#4CAF50',
        backgroundColor: '#F1F8E9',
    },
    serviceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    serviceIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary + '20',
        textAlign: 'center',
        lineHeight: 40,
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginRight: 12,
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    serviceQuestions: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    progressBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    progressTextComplete: {
        color: '#4CAF50',
    },
    checkmark: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        marginTop: 12,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
    },
});

export default ServiceSelectionScreen;
