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
} from 'react-native';
import { COLORS } from '../constants/colors';
import useAuditStore from '../store/useAuditStore';
import NoteSelector from '../components/NoteSelector';
import NAButton from '../components/NAButton';
import PhotoCapture from '../components/PhotoCapture';
import { saveDraftReponses } from '../utils/storage';

const QuestionScreen = ({ navigation }) => {
  const currentQuestion = useAuditStore((state) => state.getCurrentQuestion());
  const currentQuestionIndex = useAuditStore((state) => state.currentQuestionIndex);
  const questions = useAuditStore((state) => state.questions);
  const gravites = useAuditStore((state) => state.gravites);
  const reponses = useAuditStore((state) => state.reponses);
  const currentAudit = useAuditStore((state) => state.currentAudit);
  const setReponse = useAuditStore((state) => state.setReponse);
  const nextQuestion = useAuditStore((state) => state.nextQuestion);
  const previousQuestion = useAuditStore((state) => state.previousQuestion);
  
  // États locaux
  const [note, setNote] = useState(null);
  const [isNA, setIsNA] = useState(false);
  const [raisonNA, setRaisonNA] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [photos, setPhotos] = useState([]);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  
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
  
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.container}>
      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} / {questions.length}
        </Text>
        
        {/* Indicateur auto-save */}
        {lastSaveTime && (
          <Text style={styles.saveIndicator}>
            💾 Sauvegardé à {lastSaveTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
      
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
    </View>
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  saveIndicator: {
    fontSize: 10,
    color: COLORS.success,
    textAlign: 'center',
    marginTop: 4,
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
