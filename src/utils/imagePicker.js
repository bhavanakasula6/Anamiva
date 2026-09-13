import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export const pickImage = async () => {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo library access in your device settings to change your profile picture.',
      );
      return { cancelled: true, error: 'Permission denied' };
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled) {
    return { cancelled: true };
  }

  const asset = result.assets[0];

  return {
    cancelled: false,
    uri: asset.uri,
    file: asset.file,
    name: asset.fileName || asset.name || asset.file?.name,
    mimeType: asset.mimeType || asset.file?.type,
  };
};
