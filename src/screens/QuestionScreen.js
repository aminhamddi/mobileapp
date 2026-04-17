/**
 * Ecran de question avec filtrage par service
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,
  Modal,
} from 'react-native';
import { isWeb } from '../utils/responsive';
import { COLORS } from '../constants/colors';
import useAuditStore from '../store/useAuditStore';
import NoteSelector from '../components/NoteSelector';
import NAButton from '../components/NAButton';
import PhotoCapture from '../components/PhotoCapture';
import { saveDraftReponses } from '../utils/storage';
import { saveAuditResponses, getServicesWithQuestions } from '../services/api';

const QuestionScreen = ({ navigation }) => {
  const currentQuestion = useAuditStore((state) => state.getCurrentQuestion());
  const currentQuestionIndex = useAuditStore((state) => state.currentQuestionIndex);
  const filteredQuestions = useAuditStore((state) => state.filteredQuestions);
  const currentServiceId = useAuditStore((state) => state.currentServiceId);
  const gravites = useAuditStore((state) => state.gravites);
  const reponses = useAuditStore((state) => state.reponses);
  const currentAudit = useAuditStore((state) => state.currentAudit);
  const setReponse = useAuditStore((state) => state.setReponse);
  const nextQuestion = useAuditStore((state) => state.nextQuestion);
  const previousQuestion = useAuditStore((state) => state.previousQuestion);
  const setService = useAuditStore((state) => state.setService);
  const getServiceProgress = useAuditStore((state) => state.getServiceProgress);

  const [servicesData, setServicesData] = useState([]);

  // Etats locaux
  const [note, setNote] = useState(null);
  const [isNA, setIsNA] = useState(false);
  const [raisonNA, setRaisonNA] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [photos, setPhotos] = useState([]);
  const [deviation, setDeviation] = useState(false);
  const [designation, setDesignation] = useState(null);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  // Charger services pour la barre de navigation
  useEffect(() => {
    loadServices();
    if (isWeb) {
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleNext();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  const loadServices = async () => {
    try {
      const data = await getServicesWithQuestions();
      setServicesData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement services:', error);
    }
  };

  // Charger reponse existante
  useEffect(() => {
    if (currentQuestion) {
      const existingReponse = reponses[currentQuestion.id];
      if (existingReponse) {
        setNote(existingReponse.note);
        setIsNA(existingReponse.is_na || false);
        setRaisonNA(existingReponse.raison_na || '');
        setCommentaire(existingReponse.commentaire || '');
        setPhotos(existingReponse.photos || []);
        setDeviation(existingReponse.deviation || false);
        setDesignation(existingReponse.designation || null);
      } else {
        setNote(null);
        setIsNA(false);
        setRaisonNA('');
        setCommentaire('');
        setPhotos([]);
        setDeviation(false);
        setDesignation(null);
      }
    }
  }, [currentQuestion, reponses]);

  // AUTO-SAVE toutes les 30 secondes
  useEffect(() => {
    if (!currentAudit) return;

    const interval = setInterval(async () => {
      if (Object.keys(reponses).length > 0 && currentAudit) {
        // Save to local storage
        await saveDraftReponses(currentAudit.id, reponses);
        
        // Save to API (server backup - BATCH)
        try {
            const responsesToSave = Object.entries(reponses).map(([qId, r]) => ({
                audit_id: currentAudit.id,
                question_id: parseInt(qId),
                ...r
            }));
            await saveAuditResponses(currentAudit.id, responsesToSave);
            setLastSaveTime(new Date());
        } catch (e) {
            console.error('Erreur auto-save:', e);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentAudit, reponses]);

  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  // Trouver gravite
  const gravite = gravites.find((g) => g.id === currentQuestion.gravite_id);

  // Detection automatique de deviation selon gravite
  const detectDeviation = (selectedNote, gravite) => {
    if (!gravite || selectedNote === null) return false;
    const niveau = gravite.niveau;
    if (niveau === 1) return selectedNote < 2;
    if (niveau === 2) return selectedNote < 3;
    if (niveau === 3) return selectedNote < 4;
    if (niveau === 4) return selectedNote === 0;
    return false;
  };

  // Suggestion de designation selon la note
  const suggestDesignation = (selectedNote, gravite) => {
    if (!gravite || selectedNote === null) return 'AA';
    if (selectedNote === 0) return 'DMA';
    if (selectedNote <= 2) return 'DMI';
    return 'AA';
  };

  // Sauvegarder la reponse courante
  const saveCurrentReponse = () => {
    // Permettre la sauvegarde même sans note si commentaire ou photos existent
    if (note !== null || isNA || (commentaire && commentaire.trim().length > 0) || (photos && photos.length > 0)) {
      setReponse(currentQuestion.id, {
        question_id: currentQuestion.id,
        note: isNA ? null : note,
        is_na: isNA,
        raison_na: isNA ? raisonNA : null,
        commentaire,
        photos,
        deviation: isNA ? false : deviation,
        designation: isNA ? null : designation,
      });
    }
  };
  
  const handleSelectNote = (selectedNote) => {


    setNote(selectedNote);
    setIsNA(false);
    setRaisonNA('');

    const isDeviation = detectDeviation(selectedNote, gravite);
    setDeviation(isDeviation);

    if (isDeviation) {
      setDesignation(suggestDesignation(selectedNote, gravite));
    } else {
      setDesignation(null);
    }
  };

  const saveOnly = async () => {
    saveCurrentReponse();
    const currentReponses = useAuditStore.getState().reponses;
    const currentAudit = useAuditStore.getState().currentAudit;
    
    if (Object.keys(currentReponses).length > 0 && currentAudit) {
        try {
            const responsesToSave = Object.entries(currentReponses).map(([qId, r]) => ({
                audit_id: currentAudit.id,
                question_id: parseInt(qId),
                ...r
            }));
            await saveAuditResponses(currentAudit.id, responsesToSave);
            setLastSaveTime(new Date());
            return true;
        } catch (e) {
            console.error('Erreur sauvegarde:', e);
            Alert.alert('Erreur', 'Impossible de sauvegarder.');
            return false;
        }
    }
    return true;
  };

  const handleSaveAndExit = async () => {
    const success = await saveOnly();
    if (success) {
        setSaveModalVisible(false);
        navigation.navigate('Home');
    }
  };

  const handleToggleNA = (value) => {
    setIsNA(value);
    if (value) {
      setNote(null);
      setDeviation(false);
      setDesignation(null);
    }
  };

  const handleNext = () => {
    if (!isNA && note === null) {
      Alert.alert('Attention', 'Veuillez selectionner une note ou marquer NA');
      return;
    }

    saveCurrentReponse();

    if (currentQuestionIndex < filteredQuestions.length - 1) {
      nextQuestion();
    } else {
      // Derniere question du service — verifier si TOUTES les questions sont repondues
      const questions = useAuditStore.getState().questions;
      const reponses = useAuditStore.getState().reponses;
      const unanswered = questions.filter(q => !reponses[q.id]).length;

      if (unanswered === 0) {
        navigation.navigate('Recap');
      } else {
        Alert.alert('Service termine', 'Choisissez un autre service pour continuer.');
        navigation.navigate('ServiceSelection');
      }
    }
  };

  const handlePrevious = () => {
    saveCurrentReponse();
    previousQuestion();
  };

  // Switch to a different service (save current first)
  const handleSwitchService = (serviceId) => {
    if (serviceId === currentServiceId) return;
    saveCurrentReponse();
    setService(serviceId);
  };

  const progress = filteredQuestions.length > 0
    ? ((currentQuestionIndex + 1) / filteredQuestions.length) * 100
    : 0;

  const getServiceColor = (serviceId) => {
    const colors = ['#1976D2', '#E91E63', '#FF9800', '#4CAF50', '#9C27B0', '#00BCD4', '#F44336'];
    const idx = servicesData.findIndex(s => s.id === serviceId);
    return colors[idx >= 0 ? idx % colors.length : 0];
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <SafeAreaView style={styles.container}>
        {/* Barre de progression */}
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                saveCurrentReponse();
                navigation.navigate('ServiceSelection');
              }}
            >
              <Text style={styles.backButtonText}>Services</Text>
            </TouchableOpacity>
            <Text style={styles.progressText}>
              {currentQuestionIndex + 1} / {filteredQuestions.length}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          {lastSaveTime && (
            <Text style={styles.saveIndicator}>
              Sauvegarde a {lastSaveTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        {/* Barre de navigation par service */}
        {servicesData.length > 0 && (
          <View style={styles.serviceBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.serviceBar}
            >
              {servicesData.map((service) => {
                const isActive = currentServiceId === service.id;
                const color = getServiceColor(service.id);
                const prog = getServiceProgress(service.id);
                const isComplete = prog.total > 0 && prog.answered === prog.total;

                return (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceChip,
                      isActive && { backgroundColor: color, borderColor: color },
                      isComplete && !isActive && { borderColor: '#4CAF50' },
                    ]}
                    onPress={() => handleSwitchService(service.id)}
                  >
                    <Text
                      style={[
                        styles.serviceChipText,
                        isActive && { color: '#FFFFFF' },
                      ]}
                      numberOfLines={1}
                    >
                      {service.nom}
                    </Text>
                    <Text
                      style={[
                        styles.serviceChipCount,
                        isActive && { color: '#FFFFFF' },
                        isComplete && !isActive && { color: '#4CAF50' },
                      ]}
                    >
                      {prog.answered}/{prog.total}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Contenu de la question */}
        <ScrollView style={styles.scrollView}>
          <View style={styles.questionContainer}>
            {/* En-tete */}
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>Q{currentQuestion.numero}</Text>
              {gravite && (
                <Text style={[
                  styles.graviteBadge,
                  {
                    backgroundColor:
                      gravite.niveau === 4 ? '#F44336' :
                      gravite.niveau === 3 ? '#FF9800' :
                      gravite.niveau === 2 ? '#2196F3' : '#9E9E9E'
                  }
                ]}>
                  {gravite.nom}
                </Text>
              )}
            </View>

            {/* Texte de la question */}
            <Text style={styles.questionText}>{currentQuestion.texte}</Text>

            {/* Selecteur de note */}
            {!isNA && (
              <NoteSelector
                selectedNote={note}
                onSelectNote={handleSelectNote}
                gravite={gravite}
                disabled={isNA}
              />
            )}

            {/* Bouton NA */}
            <NAButton
              isNA={isNA}
              raison={raisonNA}
              onToggleNA={handleToggleNA}
              onChangeRaison={setRaisonNA}
              disabled={note !== null}
            />

            {/* Deviation detectee */}
            {deviation && !isNA && (
              <View style={styles.deviationContainer}>
                <Text style={styles.deviationTitle}>Deviations detectee</Text>
                <View style={styles.designationContainer}>
                  {['AA', 'DMI', 'DMA'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.designationButton,
                        designation === d && styles.designationButtonActive,
                      ]}
                      onPress={() => setDesignation(d)}
                    >
                      <Text style={[
                        styles.designationText,
                        designation === d && styles.designationTextActive,
                      ]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Commentaire */}
            <TextInput
              style={styles.commentInput}
              placeholder="Commentaire (optionnel)..."
              value={commentaire}
              onChangeText={setCommentaire}
              multiline
              numberOfLines={3}
            />

            {/* Photos */}
            <PhotoCapture
              photos={photos}
              onPhotosChange={setPhotos}
              disabled={isNA}
            />
          </View>
        </ScrollView>

        {/* Boutons de navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.prevButton,
              currentQuestionIndex === 0 && styles.navButtonDisabled,
            ]}
            onPress={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <Text style={styles.navButtonText} numberOfLines={1} adjustsFontSizeToFit>Precedent</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.saveButton]}
            onPress={() => setSaveModalVisible(true)}
          >
            <Text style={styles.navButtonText} numberOfLines={1} adjustsFontSizeToFit>Sauvegarder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={handleNext}
          >
            <Text style={[styles.navButtonText, styles.nextButtonText]} numberOfLines={1} adjustsFontSizeToFit>
              {currentQuestionIndex >= filteredQuestions.length - 1 ? 'Terminer' : 'Suivant'}
            </Text>
          </TouchableOpacity>
        </View>
        </SafeAreaView>
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
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    ...(isWeb && {
      paddingHorizontal: 20,
    }),
  },
  progressContainer: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...(isWeb && {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginTop: 20,
      maxWidth: 800,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  questionContainer: {
    padding: 20,
    ...(isWeb && {
      maxWidth: 800,
      alignSelf: 'center',
      width: '100%',
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      marginTop: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },

  progressContainer: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  saveIndicator: {
    fontSize: 11,
    color: '#4CAF50',
    textAlign: 'right',
    marginTop: 4,
  },
  serviceBarContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  serviceBar: {
    paddingHorizontal: 12,
    gap: 8,
  },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  serviceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  serviceChipCount: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  questionContainer: {
    padding: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 12,
  },
  graviteBadge: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  questionText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 20,
  },
  deviationContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  deviationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: 10,
  },
  designationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  designationButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  designationButtonActive: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warning + '20',
  },
  designationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  designationTextActive: {
    color: COLORS.warning,
  },
  commentInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  navigationContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 4,
  },
  saveButton: {
    backgroundColor: '#FFEB3B',
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 4,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  nextButtonText: {
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

export default QuestionScreen;
