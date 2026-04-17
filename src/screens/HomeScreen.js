import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import useAuditStore from '../store/useAuditStore';
import { getQuestions, getCategories, getGravites } from '../services/api';
import wsService from '../services/websocket';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  
  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const user = useAuditStore((state) => state.user);
  const logout = useAuditStore((state) => state.logout);
  const setQuestions = useAuditStore((state) => state.setQuestions);
  const setCategories = useAuditStore((state) => state.setCategories);
  const setGravites = useAuditStore((state) => state.setGravites);

  const lastAlertTimeRef = useRef(0);
  const lastAuditIdRef = useRef(null);

  useEffect(() => {
    loadData();

    const handleAuditFinalized = (data) => {
      setIsLive(true);
      setTimeout(() => setIsLive(false), 3000);
      
      const now = Date.now();
      const isDuplicate = data.id && lastAuditIdRef.current === data.id;
      const isTooSoon = now - lastAlertTimeRef.current < 2000; // 2 secondes

      // N'afficher l'alerte que si :
      // 1. On est sur l'écran d'accueil
      // 2. Ce n'est pas un doublon immédiat
      if (isFocusedRef.current && !isDuplicate && !isTooSoon) {
        lastAlertTimeRef.current = now;
        lastAuditIdRef.current = data.id || null;
        Alert.alert('Nouvel Audit', `${data.plant} - Score: ${data.score}%`);
      }
    };

    wsService.on('auditFinalized', handleAuditFinalized);
    return () => {
      wsService.off('auditFinalized', handleAuditFinalized);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [questions, categories, gravites] = await Promise.all([
        getQuestions(),
        getCategories(),
        getGravites(),
      ]);
      setQuestions(questions);
      setCategories(categories);
      setGravites(gravites);
    } catch (error) {
      console.error('Erreur chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{user?.nom || 'Auditeur'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>🚪 Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {/* Live Badge if active */}
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveText}>NOUVEL AUDIT EN DIRECT</Text>
          </View>
        )}

        {/* Bouton Mes Audits */}
        <TouchableOpacity
          style={styles.auditsButton}
          onPress={() => navigation.navigate('AuditsList')}
        >
          <View style={styles.auditsButtonIcon}>
            <Text style={styles.auditsButtonIconText}>📋</Text>
          </View>
          <View style={styles.auditsButtonContent}>
            <Text style={styles.auditsButtonTitle}>Mes Audits</Text>
            <Text style={styles.auditsButtonSubtitle}>
              Voir tous mes audits
            </Text>
          </View>
          <Text style={styles.auditsButtonArrow}>›</Text>
        </TouchableOpacity>

        {/* Bouton Nouvel Audit */}
        <TouchableOpacity
          style={styles.newAuditButton}
          onPress={() => navigation.navigate('AuditTypeSelection')}
        >
          <View style={styles.newAuditButtonIcon}>
            <Text style={styles.newAuditButtonIconText}>➕</Text>
          </View>
          <View style={styles.newAuditButtonContent}>
            <Text style={styles.newAuditButtonTitle}>Nouvel Audit</Text>
            <Text style={styles.newAuditButtonSubtitle}>
              Commencer un audit OEE
            </Text>
          </View>
          <Text style={styles.newAuditButtonArrow}>›</Text>
        </TouchableOpacity>

        {/* Stats rapides (optionnel) */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Plant : {user?.plant || '-'}</Text>
          <Text style={styles.statsSubtitle}>
            Rôle : {user?.role || 'Auditeur'}
          </Text>
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    marginTop: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  liveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  auditsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  auditsButtonIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  auditsButtonIconText: {
    fontSize: 28,
  },
  auditsButtonContent: {
    flex: 1,
  },
  auditsButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  auditsButtonSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  auditsButtonArrow: {
    fontSize: 32,
    color: '#2196F3',
    fontWeight: '300',
  },
  newAuditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newAuditButtonIcon: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  newAuditButtonIconText: {
    fontSize: 28,
  },
  newAuditButtonContent: {
    flex: 1,
  },
  newAuditButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  newAuditButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  newAuditButtonArrow: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: '300',
  },
  statsContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});
