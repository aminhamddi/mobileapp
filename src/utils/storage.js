import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@oee_audit:token',
  USER: '@oee_audit:user',
  CURRENT_AUDIT: '@oee_audit:current_audit',
  DRAFT_REPONSES: '@oee_audit:draft_reponses',
};

// ========== TOKEN ==========

export const saveToken = async (token) => {
  try {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.TOKEN);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const clearToken = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.TOKEN);
  } catch (error) {
    console.error('Error clearing token:', error);
  }
};

// ========== USER ==========

export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

export const getUser = async () => {
  try {
    const user = await AsyncStorage.getItem(KEYS.USER);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const clearUser = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.USER);
  } catch (error) {
    console.error('Error clearing user:', error);
  }
};

// ========== CURRENT AUDIT ==========

export const saveCurrentAudit = async (audit) => {
  try {
    await AsyncStorage.setItem(KEYS.CURRENT_AUDIT, JSON.stringify(audit));
  } catch (error) {
    console.error('Error saving current audit:', error);
  }
};

export const getCurrentAudit = async () => {
  try {
    const audit = await AsyncStorage.getItem(KEYS.CURRENT_AUDIT);
    return audit ? JSON.parse(audit) : null;
  } catch (error) {
    console.error('Error getting current audit:', error);
    return null;
  }
};

export const clearCurrentAudit = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.CURRENT_AUDIT);
  } catch (error) {
    console.error('Error clearing current audit:', error);
  }
};

// ========== DRAFT REPONSES (AUTO-SAVE) ==========

export const saveDraftReponses = async (auditId, reponses) => {
  try {
    const key = `${KEYS.DRAFT_REPONSES}:${auditId}`;
    await AsyncStorage.setItem(key, JSON.stringify({
      auditId,
      reponses,
      savedAt: new Date().toISOString(),
    }));
    console.log('Draft saved:', Object.keys(reponses).length, 'réponses');
  } catch (error) {
    console.error('Error saving draft reponses:', error);
  }
};

export const getDraftReponses = async (auditId) => {
  try {
    const key = `${KEYS.DRAFT_REPONSES}:${auditId}`;
    const draft = await AsyncStorage.getItem(key);
    return draft ? JSON.parse(draft) : null;
  } catch (error) {
    console.error('Error getting draft reponses:', error);
    return null;
  }
};

export const clearDraftReponses = async (auditId) => {
  try {
    const key = `${KEYS.DRAFT_REPONSES}:${auditId}`;
    await AsyncStorage.removeItem(key);
    console.log('Draft cleared for audit:', auditId);
  } catch (error) {
    console.error('Error clearing draft reponses:', error);
  }
};

// ========== CLEAR ALL ==========

export const clearAll = async () => {
  try {
    await AsyncStorage.clear();
    console.log('All storage cleared');
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
};
