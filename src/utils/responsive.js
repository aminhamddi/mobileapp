import { Platform, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Utilitaires pour rendre l'interface adaptative
 */
export const isWeb = Platform.OS === 'web';
export const isDesktop = isWeb && width > 768;

export const responsiveLayout = (webStyles, nativeStyles) => {
  return isWeb ? webStyles : nativeStyles;
};
