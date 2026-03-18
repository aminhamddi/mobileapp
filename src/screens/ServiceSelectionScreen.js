/**
 * Écran sélection service
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { createAudit, getServices } from '../services/api';
import useAuditStore from '../store/useAuditStore';

const ServiceSelectionScreen = ({ navigation }) => {
    const [selectedService, setSelectedService] = useState(null);
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState([]);

    const user = useAuditStore((state) => state.user);
    const setCurrentAudit = useAuditStore((state) => state.setCurrentAudit);
    const reset = useAuditStore((state) => state.reset);

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            const data = await getServices();
            setServices(data);
        } catch (error) {
            console.error('Erreur chargement services:', error);
            Alert.alert('Erreur', 'Impossible de charger les services');
        }
    };

    const handleStartAudit = async () => {
        if (!selectedService) {
            Alert.alert('Attention', 'Veuillez sélectionner un service');
            return;
        }

        setLoading(true);

        try {
            // Reset store avant de commencer un nouvel audit
            reset();

            // Créer audit en DB
            const auditData = {
                plant: user.plant,
                service_id: selectedService,
                date_audit: new Date().toISOString().split('T')[0],
                heure_debut: new Date().toTimeString().split(' ')[0],
            };

            console.log('Creating audit:', auditData);
            const audit = await createAudit(auditData);
            console.log('Audit created:', audit);

            // Sauvegarder audit dans store
            setCurrentAudit(audit);

            // Naviguer vers questions
            navigation.navigate('Question');

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

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                <Text style={styles.title}>Sélectionnez un service</Text>
                <Text style={styles.subtitle}>
                    Service audité : {user?.service || 'Tous services'}
                </Text>

                {Array.isArray(services) ? services.map((service) => (
                    <TouchableOpacity
                        key={service.id}
                        style={[
                            styles.serviceCard,
                            selectedService === service.id && styles.serviceCardSelected,
                            // { borderLeftColor: service.color }, // Color not available in API
                        ]}
                        onPress={() => setSelectedService(service.id)}
                    >
                        <Text style={styles.serviceName}>{service.nom}</Text>
                        {selectedService === service.id && (
                            <Text style={styles.checkmark}>✓</Text>
                        )}
                    </TouchableOpacity>
                )) : (
                    <Text style={styles.errorText}>Erreur : Liste des services non disponible</Text>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, (!selectedService || loading) && styles.buttonDisabled]}
                    onPress={handleStartAudit}
                    disabled={!selectedService || loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Démarrage...' : 'Démarrer l\'audit'}
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
    content: {
        flex: 1,
        padding: 20,
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
        marginBottom: 20,
    },
    serviceCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        borderLeftWidth: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    serviceCardSelected: {
        backgroundColor: '#E3F2FD',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    checkmark: {
        fontSize: 24,
        color: COLORS.primary,
    },
    footer: {
        padding: 20,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    errorText: {
        color: COLORS.danger,
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
});

export default ServiceSelectionScreen;
