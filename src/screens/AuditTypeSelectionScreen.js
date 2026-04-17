/**
 * Ecran de selection type audit (Normal vs Projet)
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';
import { getProjects } from '../services/api';
import useAuditStore from '../store/useAuditStore';
import { SafeAreaView } from 'react-native-safe-area-context';

const AuditTypeSelectionScreen = ({ navigation }) => {
    const [auditType, setAuditType] = useState('normal'); // 'normal' | 'project'
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [loading, setLoading] = useState(false);
    const setCurrentProjectId = useAuditStore((state) => state.setCurrentProjectId);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const data = await getProjects();
            setProjects(data.filter(p => p.actif));
        } catch (error) {
            console.error('Erreur:', error);
            Alert.alert('Erreur', 'Impossible de charger les projets');
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = () => {
        if (auditType === 'project' && !selectedProjectId) {
            Alert.alert('Attention', 'Veuillez sélectionner un projet');
            return;
        }
        
        setCurrentProjectId(auditType === 'project' ? selectedProjectId : null);
        navigation.navigate('ServiceSelection');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Type d'Audit</Text>
                
                <TouchableOpacity
                    style={[styles.card, auditType === 'normal' && styles.cardSelected]}
                    onPress={() => setAuditType('normal')}
                >
                    <Text style={styles.cardTitle}>Audit Normal</Text>
                    <Text style={styles.cardText}>Cibles globales (85%/95%)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.card, auditType === 'project' && styles.cardSelected]}
                    onPress={() => setAuditType('project')}
                >
                    <Text style={styles.cardTitle}>Audit Projet</Text>
                    <Text style={styles.cardText}>Cibles spécifiques au projet</Text>
                </TouchableOpacity>

                {auditType === 'project' && (
                    <View style={styles.projectList}>
                        <Text style={styles.label}>Sélectionner un projet :</Text>
                        {loading ? <ActivityIndicator /> : projects.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.projectItem, selectedProjectId === p.id && styles.projectItemSelected]}
                                onPress={() => setSelectedProjectId(p.id)}
                            >
                                <Text style={styles.projectItemText}>{p.nom}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                    <Text style={styles.continueButtonText}>Continuer</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    card: { padding: 20, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, marginBottom: 15 },
    cardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
    cardTitle: { fontSize: 18, fontWeight: 'bold' },
    cardText: { fontSize: 14, color: COLORS.textSecondary },
    projectList: { marginTop: 15, padding: 10 },
    label: { fontSize: 16, marginBottom: 10 },
    projectItem: { padding: 12, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
    projectItemSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
    projectItemText: { fontSize: 16 },
    continueButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    continueButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default AuditTypeSelectionScreen;
