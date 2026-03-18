import React, { useState, useEffect } from 'react';
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

export default function AuditsListScreen() {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all'); // all, draft, finalise
    const navigation = useNavigation();
    const { setCurrentAudit } = useAuditStore();

    // Charger audits au focus de l'écran
    useFocusEffect(
        React.useCallback(() => {
            loadAudits();
        }, [filter])
    );

    const loadAudits = async () => {
        try {
            setLoading(true);
            const params = filter !== 'all' ? { statut: filter } : {};
            const response = await api.get('/api/audits', { params });
            setAudits(response.data);
        } catch (error) {
            console.error('Erreur chargement audits:', error);
            Alert.alert('Erreur', 'Impossible de charger les audits');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadAudits();
    };

    const handleAuditPress = (audit) => {
        if (audit.statut === 'draft') {
            // Continuer l'audit en cours
            setCurrentAudit(audit);
            navigation.navigate('ServiceSelection');
        } else {
            // Voir détails audit finalisé
            navigation.navigate('AuditDetail', { auditId: audit.id });
        }
    };

    const handleDeleteAudit = async (auditId) => {
        Alert.alert(
            'Supprimer audit',
            'Voulez-vous vraiment supprimer cet audit brouillon ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/api/audits/${auditId}`);
                            loadAudits();
                            Alert.alert('Succès', 'Audit supprimé');
                        } catch (error) {
                            Alert.alert('Erreur', 'Impossible de supprimer');
                        }
                    },
                },
            ]
        );
    };

    const getScoreColor = (score) => {
        if (!score) return '#999';
        const percent = score * 100;
        if (percent >= 80) return '#4CAF50';
        if (percent >= 60) return '#FF9800';
        return '#F44336';
    };

    const renderAuditItem = ({ item }) => (
        <TouchableOpacity
            style={styles.auditCard}
            onPress={() => handleAuditPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.auditHeader}>
                <View>
                    <Text style={styles.auditPlant}>{item.plant}</Text>
                    <Text style={styles.auditDate}>
                        {new Date(item.date_audit).toLocaleDateString('fr-FR')}
                    </Text>
                </View>

                <View style={styles.auditStatus}>
                    {item.statut === 'finalise' ? (
                        <View style={styles.scoreContainer}>
                            <Text style={[styles.scoreText, { color: getScoreColor(item.score_global) }]}>
                                {item.score_global ? `${(item.score_global * 100).toFixed(0)}%` : '-'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.draftBadge}>
                            <Text style={styles.draftText}>Brouillon</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.auditFooter}>
                <View style={styles.auditInfo}>
                    <Text style={styles.infoLabel}>ID: {item.id}</Text>
                    {item.statut === 'finalise' && (
                        <>
                            <Text style={styles.infoDot}>•</Text>
                            <Text style={styles.infoLabel}>
                                {item.nb_deviations || 0} déviations
                            </Text>
                        </>
                    )}
                </View>

                {item.statut === 'draft' && (
                    <TouchableOpacity
                        onPress={() => handleDeleteAudit(item.id)}
                        style={styles.deleteButton}
                    >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Aucun audit trouvé</Text>
            <Text style={styles.emptySubtext}>
                {filter === 'draft'
                    ? "Pas d'audits en brouillon"
                    : filter === 'finalise'
                        ? 'Pas d\'audits finalisés'
                        : 'Créez votre premier audit !'}
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
            {/* Header avec bouton Retour et filtres */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Retour</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Mes Audits</Text>

                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                        onPress={() => setFilter('all')}
                    >
                        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                            Tous ({audits.length})
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
                        style={[styles.filterButton, filter === 'finalise' && styles.filterButtonActive]}
                        onPress={() => setFilter('finalise')}
                    >
                        <Text style={[styles.filterText, filter === 'finalise' && styles.filterTextActive]}>
                            Finalisés
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Liste audits */}
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
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    filterContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
    },
    filterButtonActive: {
        backgroundColor: '#2196F3',
    },
    filterText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#FFF',
    },
    listContent: {
        padding: 16,
    },
    auditCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    auditHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    auditPlant: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    auditDate: {
        fontSize: 14,
        color: '#666',
    },
    auditStatus: {
        alignItems: 'flex-end',
    },
    scoreContainer: {
        backgroundColor: '#F0F0F0',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    scoreText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    draftBadge: {
        backgroundColor: '#FFF3E0',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    draftText: {
        fontSize: 14,
        color: '#FF9800',
        fontWeight: '600',
    },
    auditFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    auditInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoLabel: {
        fontSize: 12,
        color: '#999',
    },
    infoDot: {
        fontSize: 12,
        color: '#999',
    },
    deleteButton: {
        padding: 8,
    },
    deleteButtonText: {
        fontSize: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
});