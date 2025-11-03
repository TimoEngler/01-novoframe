// Home screen component
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to NovoFrame</Text>
      {isAuthenticated && user ? (
        <View style={styles.userInfo}>
          <Text style={styles.text}>Logged in as: {user.email}</Text>
          <Button title="Logout" onPress={logout} />
        </View>
      ) : (
        <View>
          <Text style={styles.text}>Please log in</Text>
          <Button
            title="Go to Login"
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  userInfo: {
    alignItems: 'center',
  },
});

