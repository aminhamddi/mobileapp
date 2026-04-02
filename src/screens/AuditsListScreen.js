import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import useAuditStore from '../store/useAuditStore';
import { getDraftReponses } from '../utils/storage';

export default function AuditsListScreen() {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');
    const [draftProgress, setDraftProgress] = useState({});
    const navigation = useNavigation();
    const setCurrentAudit = useAuditStore((state) => state.setCurrentAudit);
    const setReponse = useAuditStore((state) => state.setReponse);
    const reset = useAuditStore((state) => state.reset);

    useFocusEffect(
        React.useCallback(() => {
            loadAudits();
        }, [filter])
    );

    const loadAudits = async () => {
        try {
            setLoading(true);
            const params = filter !== 'all' ? { statut: filter } : { limit: 50 };
            const response = await api.get('/api/audits', { params });
            const auditsData = response.data;
            setAudits(auditsData);

            // Load progress from local storage for each draft
            const progress = {};
            for (const audit of auditsData) {
                if (audit.statut === 'draft') {
                    const draft = await getDraftReponses(audit.id);
                    if (draft?.reponses) {
                        progress[audit.id] = Object.keys(draft.reponses).length;
                    }
                }
            }
            setDraftProgress(progress);
        } catch (error) {
            console.error('Erreur chargement audits:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadAudits();
    };

    // Resume a draft audit — load responses from LOCAL STORAGE
    const handleResumeAudit = async (audit) => {
        try {
            setLoading(true);
            reset();
            setCurrentAudit(audit);

            // Load from local storage (where drafts are saved)
            const draft = await getDraftReponses(audit.id);
            if (draft?.reponses) {
                Object.entries(draft.reponses).forEach(([questionId, reponseData]) => {
                    setReponse(parseInt(questionId), reponseData);
                });
            }

            navigation.navigate('ServiceSelection');
        } catch (error) {
            console.error('Erreur reprise audit:', error);
            Alert.alert('Erreur', 'Impossible de charger les reponses');
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

    const renderAuditItem = ({ item }) => {
        const isDraft = item.statut === 'draft';
        const nbReponses = draftProgress[item.id] || 0;

        return (
            <TouchableOpacity
                style={[styles.auditCard, isDraft && styles.auditCardDraft]}
                onPress={() => isDraft ? handleResumeAudit(item) : navigation.navigate('AuditDetail', { auditId: item.id })}
                activeOpacity={0.7}
            >
                <View style={styles.auditHeader}>
                    <View style={styles.auditHeaderLeft}>
                        <Text style={styles.auditPlant}>{item.plant?.nom || '—'}</Text>
                        <Text style={styles.auditDate}>
                            {new Date(item.date_audit).toLocaleDateString('fr-FR')}
                        </Text>
                        {item.auditeur && (
                            <Text style={styles.auditeurName}>Par: {item.auditeur.nom}</Text>
                        )}
                    </View>

                    <View style={styles.auditStatus}>
                        {isDraft ? (
                            <View style={styles.draftBadge}>
                                <Text style={styles.draftText}>Brouillon</Text>
                            </View>
                        ) : (
                            <View style={styles.scoreContainer}>
                                <Text style={[styles.scoreText, { color: getScoreColor(item.score_global) }]}>
                                    {item.score_global ? `${(item.score_global * 100).toFixed(0)}%` : '-'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Draft: show Continue button + progress */}
                {isDraft && (
                    <View style={styles.draftActions}>
                        <View style={styles.draftProgress}>
                            <Text style={styles.draftProgressText}>
                                {nbReponses} reponse(s) sauvegardee(s)
                            </Text>
                        </View>
                        <View style={styles.continueButton}>
                            <Text style={styles.continueButtonText}>Continuer</Text>
                        </View>
                    </View>
                )}

                <View style={styles.auditFooter}>
                    <View style={styles.auditInfo}>
                        <Text style={styles.infoLabel}>ID: {item.id}</Text>
                        {!isDraft && (
                            <>
                                <Text style={styles.infoDot}>.</Text>
                                <Text style={styles.infoLabel}>
                                    {item.nb_deviations || 0} deviations
                                </Text>
                            </>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Aucun audit trouve</Text>
            <Text style={styles.emptySubtext}>
                {filter === 'draft'
                    ? "Pas d'audits en brouillon"
                    : filter === 'finalized'
                        ? "Pas d'audits finalises"
                        : 'Creez votre premier audit !'}
            </Text>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Chargement...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Retour</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Mes Audits</Text>

                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                        onPress={() => setFilter('all')}
                    >
                        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                            Tous
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'draft' && styles.filterButtonActive]}
                        onPress={() => setFilter('draft')}
                    >
                        <Text style={[styles.filterText, filter === 'draft' && styles.filterTextActive]}>
                            Brouillons
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'finalized' && styles.filterButtonActive]}
                        onPress={() => setFilter('finalized')}
                    >
                        <Text style={[styles.filterText, filter === 'finalized' && styles.filterTextActive]}>
                            Finalises
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={audits}
                renderItem={renderAuditItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={renderEmptyState}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
    header: { backgroundColor: '#FFF', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    backButton: { marginBottom: 8 },
    backButtonText: { fontSize: 16, color: '#2196F3' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 16 },
    filterContainer: { flexDirection: 'row', gap: 8 },
    filterButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F0F0F0' },
    filterButtonActive: { backgroundColor: '#2196F3' },
    filterText: { fontSize: 14, color: '#666', fontWeight: '500' },
    filterTextActive: { color: '#FFF' },
    listContent: { padding: 16 },
    auditCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    auditCardDraft: { borderLeftWidth: 4, borderLeftColor: '#FF9800' },
    auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    auditHeaderLeft: { flex: 1 },
    auditPlant: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    auditDate: { fontSize: 14, color: '#666' },
    auditeurName: { fontSize: 12, color: '#999', marginTop: 2 },
    auditStatus: { alignItems: 'flex-end' },
    scoreContainer: { backgroundColor: '#F0F0F0', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    scoreText: { fontSize: 20, fontWeight: 'bold' },
    draftBadge: { backgroundColor: '#FFF3E0', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    draftText: { fontSize: 14, color: '#FF9800', fontWeight: '600' },
    draftActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    draftProgress: { flex: 1 },
    draftProgressText: { fontSize: 13, color: '#666' },
    continueButton: { backgroundColor: '#2196F3', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    continueButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    auditFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    auditInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLabel: { fontSize: 12, color: '#999' },
    infoDot: { fontSize: 12, color: '#999' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
});
