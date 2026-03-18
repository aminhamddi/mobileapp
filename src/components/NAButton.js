/**
 * Composant bouton NA (Non Applicable)
 * Permet de marquer une question comme non applicable
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Modal,
} from 'react-native';
import { COLORS } from '../constants/colors';

const NAButton = ({ isNA, onToggleNA, raison, onChangeRaison, disabled }) => {
    const [showModal, setShowModal] = useState(false);

    const handlePress = () => {
        if (isNA) {
            // Si déjà NA, désactiver
            onToggleNA(false);
            onChangeRaison('');
        } else {
            // Si pas NA, activer et montrer modal
            onToggleNA(true);
            setShowModal(true);
        }
    };

    const handleConfirm = () => {
        setShowModal(false);
    };

    const handleCancel = () => {
        onToggleNA(false);
        onChangeRaison('');
        setShowModal(false);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.button,
                    isNA && styles.buttonActive,
                    disabled && styles.buttonDisabled,
                ]}
                onPress={handlePress}
                disabled={disabled}
            >
                <Text style={[styles.buttonText, isNA && styles.buttonTextActive]}>
                    ⊘ NA - Non Applicable
                </Text>
            </TouchableOpacity>

            {isNA && raison && (
                <View style={styles.raisonContainer}>
                    <Text style={styles.raisonLabel}>Raison :</Text>
                    <Text style={styles.raisonText}>{raison}</Text>
                </View>
            )}

            {/* Modal pour entrer la raison */}
            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={handleCancel}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Question Non Applicable</Text>

                        <Text style={styles.modalDescription}>
                            Pourquoi cette question n'est pas applicable ?
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Scanner absent, Presse en panne..."
                            value={raison}
                            onChangeText={onChangeRaison}
                            multiline
                            numberOfLines={3}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={handleCancel}
                            >
                                <Text style={styles.cancelButtonText}>Annuler</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleConfirm}
                            >
                                <Text style={styles.confirmButtonText}>Confirmer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 15,
    },
    button: {
        backgroundColor: COLORS.surface,
        borderWidth: 2,
        borderColor: COLORS.na,
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
    },
    buttonActive: {
        backgroundColor: COLORS.naActive,
        borderColor: COLORS.naActive,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.na,
    },
    buttonTextActive: {
        color: '#FFFFFF',
    },
    raisonContainer: {
        marginTop: 10,
        padding: 12,
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.warning,
    },
    raisonLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    raisonText: {
        fontSize: 14,
        color: COLORS.text,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: COLORS.text,
        backgroundColor: COLORS.background,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
    },
    cancelButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    confirmButtonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default NAButton;