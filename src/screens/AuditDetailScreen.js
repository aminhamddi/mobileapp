import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import api, { getActionsByAudit } from '../services/api';

export default function AuditDetailScreen() {
    const [audit, setAudit] = useState(null);
    const [reponses, setReponses] = useState([]);
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const route = useRoute();
    const navigation = useNavigation();
    const { auditId } = route.params;

    useEffect(() => {
        loadAuditDetails();
    }, []);

    const loadAuditDetails = async () => {
        try {
            setLoading(true);
            const [auditRes, reponsesRes, actionsRes] = await Promise.all([
                api.get(`/api/audits/${auditId}`),
                api.get(`/api/reponses/audit/${auditId}`),
                getActionsByAudit(auditId).catch(() => []),
            ]);
            setAudit(auditRes.data);
            setReponses(reponsesRes.data);
            setActions(Array.isArray(actionsRes) ? actionsRes : []);
        } catch (error) {
            console.error('Erreur chargement détails:', error);
            Alert.alert('Erreur', 'Impossible de charger les détails');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (!score) return '#999';
        const percent = score * 100;
        if (percent >= 80) return '#4CAF50';
        if (percent >= 60) return '#FF9800';
        return '#F44336';
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Chargement...</Text>
            </View>
        );
    }

    if (!audit) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Audit non trouvé</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Retour</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Détails Audit</Text>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* Info audit */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Informations</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Plant :</Text>
                        <Text style={styles.infoValue}>{audit.plant?.nom || audit.plant || '—'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Date :</Text>
                        <Text style={styles.infoValue}>
                            {new Date(audit.date_audit).toLocaleDateString('fr-FR')}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Statut :</Text>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: audit.statut === 'finalized' ? '#E8F5E9' : '#FFF3E0' }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: audit.statut === 'finalized' ? '#4CAF50' : '#FF9800' }
                            ]}>
                                {audit.statut === 'finalized' ? 'Finalisé' : 'Brouillon'}
                            </Text>
                        </View>
                    </View>

                    {audit.statut === 'finalized' && (
                        <>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Score Global :</Text>
                                <Text style={[styles.scoreValue, { color: getScoreColor(audit.score_global) }]}>
                                    {(audit.score_global * 100).toFixed(1)}%
                                </Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Déviations :</Text>
                                <Text style={styles.infoValue}>{audit.nb_deviations || 0}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Actions générées :</Text>
                                <Text style={styles.infoValue}>{audit.nb_actions_generees || 0}</Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Commentaire global */}
                {audit.commentaire_global && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Commentaire Global</Text>
                        <Text style={styles.commentText}>{audit.commentaire_global}</Text>
                    </View>
                )}

                {/* Scores par catégorie */}
                {audit.score_par_categorie && Object.keys(audit.score_par_categorie).length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Scores par Catégorie</Text>
                        {Object.entries(audit.score_par_categorie).map(([cat, score]) => (
                            <View key={cat} style={styles.categoryRow}>
                                <Text style={styles.categoryName}>{cat}</Text>
                                <View style={styles.categoryScoreBar}>
                                    <View
                                        style={[
                                            styles.categoryScoreFill,
                                            { width: `${score * 100}%`, backgroundColor: getScoreColor(score) },
                                        ]}
                                    />
                                </View>
                                <Text style={styles.categoryScore}>{(score * 100).toFixed(0)}%</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Statistiques réponses */}
                {reponses.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Réponses</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{reponses.length}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>
                                    {reponses.filter(r => r.is_na).length}
                                </Text>
                                <Text style={styles.statLabel}>N/A</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>
                                    {reponses.filter(r => r.photos && r.photos.length > 0).length}
                                </Text>
                                <Text style={styles.statLabel}>Photos</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>
                                    {reponses.filter(r => r.deviation).length}
                                </Text>
                                <Text style={styles.statLabel}>Déviations</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Actions Correctives NLP */}
                {actions.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Actions Correctives (NLP)</Text>
                        {actions.map((action) => (
                            <View key={action.id} style={styles.actionCard}>
                                <View style={styles.actionHeader}>
                                    <Text style={[
                                        styles.actionType,
                                        { backgroundColor: action.priorite === 'Critique' ? '#FFEBEE' : action.priorite === 'Haute' ? '#FFF3E0' : '#E8F5E9' }
                                    ]}>
                                        {action.type}
                                    </Text>
                                    <Text style={styles.actionPriority}>
                                        {action.priorite}
                                    </Text>
                                </View>
                                <Text style={styles.actionTitle}>{action.titre}</Text>
                                {action.description && (
                                    <Text style={styles.actionDesc}>{action.description}</Text>
                                )}
                                <View style={styles.actionFooter}>
                                    <Text style={styles.actionResponsible}>
                                        Responsable: {action.responsable || '—'}
                                    </Text>
                                    <Text style={styles.actionDesignation}>
                                        {action.designation || '—'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#F44336',
    },
    header: {
        backgroundColor: '#FFF',
        paddingTop: 10,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        marginBottom: 8,
    },
    backButtonText: {
        fontSize: 16,
        color: '#2196F3',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    section: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    scoreValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    commentText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryName: {
        fontSize: 12,
        color: '#666',
        width: 100,
    },
    categoryScoreBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        marginHorizontal: 8,
        overflow: 'hidden',
    },
    categoryScoreFill: {
        height: '100%',
        borderRadius: 4,
    },
    categoryScore: {
        fontSize: 12,
        fontWeight: '600',
        width: 40,
        textAlign: 'right',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statBox: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2196F3',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
    },
    actionCard: {
        backgroundColor: '#FAFAFA',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#2196F3',
    },
    actionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    actionType: {
        fontSize: 11,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
        color: '#333',
    },
    actionPriority: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F44336',
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    actionDesc: {
        fontSize: 12,
        color: '#666',
        marginBottom: 6,
    },
    actionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionResponsible: {
        fontSize: 11,
        color: '#999',
    },
    actionDesignation: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2196F3',
    },
});