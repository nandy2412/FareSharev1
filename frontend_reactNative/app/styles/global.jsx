import { StyleSheet } from 'react-native';

export const COLORS = {
  black: '#000000',
  darkGrey: '#14213D',
  purple: '#8338EC',
  blue: '#0BC2DE',
  green: '#06D6A0',
  yellow: '#FFD166',
  orange: '#FB8500',
  red: '#EF476F',
  lightGrey: '#E5E5E5',
  white: '#FFFFFF',
};

export const SHARED = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: COLORS.darkGrey,
    backgroundColor: COLORS.white,
  },
  logoImage: {
    width: 50,
    height: 50,
    marginRight: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
  }
})