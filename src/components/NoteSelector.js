/**
 * Composant sélection de note
 * Affiche les notes autorisées selon la gravité
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const NoteSelector = ({ gravite, selectedNote, onSelectNote, disabled }) => {
    const notesAutorisees = gravite?.notes_autorisees || [0, 1, 2, 3, 4, 5];

    const getNoteColor = (note) => {
        const colors = {
            0: COLORS.note0,
            1: COLORS.note1,
            2: COLORS.note2,
            3: COLORS.note3,
            4: COLORS.note4,
            5: COLORS.note5,
        };
        return colors[note] || COLORS.text;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Sélectionnez une note :</Text>

            <View style={styles.notesContainer}>
                {[0, 1, 2, 3, 4, 5].map((note) => {
                    const isAuthorized = notesAutorisees.includes(note);
                    const isSelected = selectedNote === note;

                    if (!isAuthorized) {
                        return (
                            <View key={note} style={[styles.noteButton, styles.noteDisabled]}>
                                <Text style={styles.noteTextDisabled}>{note}</Text>
                            </View>
                        );
                    }

                    return (
                        <TouchableOpacity
                            key={note}
                            style={[
                                styles.noteButton,
                                isSelected && styles.noteButtonSelected,
                                { borderColor: getNoteColor(note) },
                                isSelected && { backgroundColor: getNoteColor(note) },
                            ]}
                            onPress={() => onSelectNote(note)}
                            disabled={disabled}
                        >
                            <Text
                                style={[
                                    styles.noteText,
                                    isSelected && styles.noteTextSelected,
                                ]}
                            >
                                {note}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.legend}>
                <Text style={styles.legendText}>
                    Gravité : {gravite?.nom || 'N/A'} (Notes autorisées : {notesAutorisees.join(', ')})
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 15,
    },
    notesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    noteButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
    },
    noteButtonSelected: {
        borderWidth: 3,
    },
    noteDisabled: {
        backgroundColor: '#F5F5F5',
        borderColor: '#E0E0E0',
        opacity: 0.3,
    },
    noteText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    noteTextSelected: {
        color: '#FFFFFF',
    },
    noteTextDisabled: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#BDBDBD',
    },
    legend: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
    },
    legendText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});

export default NoteSelector;