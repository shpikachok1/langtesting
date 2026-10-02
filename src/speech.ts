import * as Speech from 'expo-speech';

/** Озвучить польскую фразу системным голосом устройства. */
export function say(text: string, locale = 'pl-PL') {
  Speech.stop();
  Speech.speak(text, { language: locale, rate: 0.9 });
}
