/**
 * Écran de question avec NA button + Photos + Auto-save
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
} from 'react-native';
import { COLORS } from '../constants/colors';
import useAuditStore from '../store/useAuditStore';
import NoteSelector from '../components/NoteSelector';
import NAButton from '../components/NAButton';
import PhotoCapture from '../components/PhotoCapture';
import { saveDraftReponses } from '../utils/storage';
import { getServicesWithQuestions } from '../services/api';

const QuestionScreen = ({ navigation, route }) => {
  const currentQuestion = useAuditStore((state) => state.getCurrentQuestion());
  const currentQuestionIndex = useAuditStore((state) => state.currentQuestionIndex);
  const questions = useAuditStore((state) => state.questions);
  const gravites = useAuditStore((state) => state.gravites);
  const reponses = useAuditStore((state) => state.reponses);
  const currentAudit = useAuditStore((state) => state.currentAudit);
  const setReponse = useAuditStore((state) => state.setReponse);
  const nextQuestion = useAuditStore((state) => state.nextQuestion);
  const previousQuestion = useAuditStore((state) => state.previousQuestion);
  const goToQuestion = useAuditStore((state) => state.goToQuestion);

  const [servicesData, setServicesData] = useState([]);

  // États locaux
  const [note, setNote] = useState(null);
  const [isNA, setIsNA] = useState(false);
  const [raisonNA, setRaisonNA] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [photos, setPhotos] = useState([]);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  // Charger services pour la barre de navigation
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await getServicesWithQuestions();
      setServicesData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement services:', error);
    }
  };

  // Aller à la question de départ si spécifiée
  useEffect(() => {
    const params = route?.params;
    if (params?.startQuestionIndex && params.startQuestionIndex > 0) {
      goToQuestion(params.startQuestionIndex);
    }
  }, [route?.params?.startQuestionIndex]);

  // Charger réponse existante
  useEffect(() => {
    if (currentQuestion) {
      const existingReponse = reponses[currentQuestion.id];
      if (existingReponse) {
        setNote(existingReponse.note);
        setIsNA(existingReponse.is_na || false);
        setRaisonNA(existingReponse.raison_na || '');
        setCommentaire(existingReponse.commentaire || '');
        setPhotos(existingReponse.photos || []);
      } else {
        // Reset pour nouvelle question
        setNote(null);
        setIsNA(false);
        setRaisonNA('');
        setCommentaire('');
        setPhotos([]);
      }
    }
  }, [currentQuestion, reponses]);
  
  // AUTO-SAVE toutes les 30 secondes
  useEffect(() => {
    if (!currentAudit) return;
    
    const interval = setInterval(async () => {
      if (Object.keys(reponses).length > 0) {
        await saveDraftReponses(currentAudit.id, reponses);
        setLastSaveTime(new Date());
        console.log('Auto-save:', Object.keys(reponses).length, 'réponses');
      }
    }, 30000); // 30 secondes
    
    return () => clearInterval(interval);
  }, [currentAudit, reponses]);
  
  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }
  
  // Trouver gravité
  const gravite = gravites.find((g) => g.id === currentQuestion.gravite_id);
  
  // Handlers
  const handleSelectNote = (selectedNote) => {
    setNote(selectedNote);
    setIsNA(false);
    setRaisonNA('');
  };
  
  const handleToggleNA = (value) => {
    setIsNA(value);
    if (value) {
      setNote(null);
    }
  };
  
  const handleNext = () => {
    // Validation
    if (!isNA && note === null) {
      Alert.alert('Attention', 'Veuillez sélectionner une note ou marquer la question comme NA');
      return;
    }
    
    // Sauvegarder réponse
    setReponse(currentQuestion.id, {
      question_id: currentQuestion.id,
      note: isNA ? null : note,
      is_na: isNA,
      raison_na: isNA ? raisonNA : null,
      commentaire,
      photos,
    });
    
    // Aller suivant
    if (currentQuestionIndex < questions.length - 1) {
      nextQuestion();
    } else {
      // Dernière question, aller au récap
      navigation.navigate('Recap');
    }
  };
  
  const handlePrevious = () => {
    // Sauvegarder réponse avant de revenir
    if (note !== null || isNA) {
      setReponse(currentQuestion.id, {
        question_id: currentQuestion.id,
        note: isNA ? null : note,
        is_na: isNA,
        raison_na: isNA ? raisonNA : null,
        commentaire,
        photos,
      });
    }
    
    previousQuestion();
  };
  
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Service courant de la question active
  const currentServiceOfQuestion = currentQuestion?.services?.[0] || null;

  // Sauter au premier question d'un service
  const jumpToService = (serviceId) => {
    // Sauvegarder réponse actuelle
    if (note !== null || isNA) {
      setReponse(currentQuestion.id, {
        question_id: currentQuestion.id,
        note: isNA ? null : note,
        is_na: isNA,
        raison_na: isNA ? raisonNA : null,
        commentaire,
        photos,
      });
    }

    const sorted = [...questions].sort((a, b) => a.numero - b.numero);
    const index = sorted.findIndex(q =>
      q.services && q.services.some(s => s.id === serviceId)
    );
    if (index >= 0) {
      goToQuestion(index);
    }
  };

  const getServiceColor = (serviceId) => {
    const colors = ['#1976D2', '#E91E63', '#FF9800', '#4CAF50', '#9C27B0', '#00BCD4', '#F44336'];
    const idx = servicesData.findIndex(s => s.id === serviceId);
    return colors[idx >= 0 ? idx % colors.length : 0];
  };

  // Nombre de questions répondues par service
  const getServiceProgress = (serviceId) => {
    const serviceQs = questions.filter(q =>
      q.services && q.services.some(s => s.id === serviceId)
    );
    const answered = serviceQs.filter(q => reponses[q.id]).length;
    return { answered, total: serviceQs.length };
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <SafeAreaView style={styles.container}>
      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (note !== null || isNA) {
                setReponse(currentQuestion.id, {
                  question_id: currentQuestion.id,
                  note: isNA ? null : note,
                  is_na: isNA,
                  raison_na: isNA ? raisonNA : null,
                  commentaire,
                  photos,
                });
              }
              navigation.navigate('ServiceSelection');
            }}
          >
            <Text style={styles.backButtonText}>‹ Services</Text>
          </TouchableOpacity>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} / {questions.length}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* Indicateur auto-save */}
        {lastSaveTime && (
          <Text style={styles.saveIndicator}>
            💾 Sauvegardé à {lastSaveTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
              const isActive = currentServiceOfQuestion &&
                currentServiceOfQuestion.id === service.id;
              const color = getServiceColor(service.id);
              const prog = getServiceProgress(service.id);

              return (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceChip,
                    isActive && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => jumpToService(service.id)}
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
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Carte question */}
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionNumber}>Q{currentQuestion.numero}</Text>
            <View style={[styles.graviteBadge, { backgroundColor: getGraviteColor(gravite) }]}>
              <Text style={styles.graviteText}>{gravite?.nom}</Text>
            </View>
          </View>
          
          <Text style={styles.questionText}>{currentQuestion.texte}</Text>
          
          {currentQuestion.instructions && (
            <Text style={styles.instructions}>{currentQuestion.instructions}</Text>
          )}
        </View>
        
        {/* Note Selector */}
        <NoteSelector
          gravite={gravite}
          selectedNote={note}
          onSelectNote={handleSelectNote}
          disabled={isNA}
        />
        
        {/* Bouton NA */}
        <NAButton
          isNA={isNA}
          onToggleNA={handleToggleNA}
          raison={raisonNA}
          onChangeRaison={setRaisonNA}
          disabled={false}
        />
        
        {/* Photos */}
        <PhotoCapture
          photos={photos}
          onPhotosChange={setPhotos}
          maxPhotos={3}
          disabled={isNA}
        />
        
        {/* Commentaire */}
        <View style={styles.commentContainer}>
          <Text style={styles.commentLabel}>Commentaire (optionnel) :</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Ajouter un commentaire..."
            value={commentaire}
            onChangeText={setCommentaire}
            multiline
            numberOfLines={3}
            editable={!isNA}
          />
        </View>
        
        {/* Boutons navigation */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton]}
            onPress={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <Text style={styles.navButtonText}>← Précédent</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={handleNext}
          >
            <Text style={[styles.navButtonText, styles.nextButtonText]}>
              {currentQuestionIndex === questions.length - 1 ? 'Terminer' : 'Suivant →'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

// Helper couleur gravité
const getGraviteColor = (gravite) => {
  const colors = {
    1: '#2196F3',
    2: '#FF9800',
    3: '#F44336',
    4: '#9C27B0',
  };
  return colors[gravite?.niveau] || '#757575';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
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
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  saveIndicator: {
    fontSize: 10,
    color: COLORS.success,
    textAlign: 'center',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  questionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  graviteBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  graviteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
    fontWeight: '500',
  },
  instructions: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  commentContainer: {
    marginVertical: 15,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  prevButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
  },
  navButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  nextButtonText: {
    color: '#FFFFFF',
  },
});

export default QuestionScreen;
