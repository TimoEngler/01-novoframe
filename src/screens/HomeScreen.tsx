import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Frame } from '../types';
import { colors, spacing, borderRadius, shadows } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { frameService } from '../services/frameService';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [frames, setFrames] = useState<Frame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      loadFrames();
    }
  }, [isAuthenticated, refreshKey]);

  // Refresh frames when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isAuthenticated) {
        loadFrames();
      }
    });

    return unsubscribe;
  }, [navigation, isAuthenticated]);

  const loadFrames = async () => {
    setIsLoadingFrames(true);
    try {
      const userFrames = await frameService.getFrames();
      setFrames(userFrames);
      // Reset to first frame if current index is out of bounds
      if (currentFrameIndex >= userFrames.length) {
        setCurrentFrameIndex(0);
      }
    } catch (error: any) {
      console.error('Error loading frames:', error);
      Alert.alert('Error', 'Failed to load frames');
    } finally {
      setIsLoadingFrames(false);
    }
  };

  const handleNextFrame = () => {
    if (currentFrameIndex < frames.length - 1) {
      setCurrentFrameIndex(currentFrameIndex + 1);
    }
  };

  const handlePreviousFrame = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex(currentFrameIndex - 1);
    }
  };

  const handlePairFrame = () => {
    navigation.navigate('FrameSetup');
  };

  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to NovoFrame</Text>
          <Text style={styles.subtitle}>Your journey starts here</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentFrame = frames[currentFrameIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Profile Icon */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>NovoFrame</Text>
        <TouchableOpacity
          style={styles.profileIcon}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileIconText}>
            {user.username.charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {isLoadingFrames ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : frames.length === 0 ? (
          // No frames state
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Frames Yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              You haven't added a frame yet
            </Text>
            <TouchableOpacity style={styles.button} onPress={handlePairFrame}>
              <Text style={styles.buttonText}>Pair Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Frame display
          <View style={styles.frameContainer}>
            <View style={styles.frameCard}>
              <View style={styles.frameHeader}>
                <Text style={styles.frameName}>{currentFrame.name}</Text>
                <View style={[
                  styles.statusBadge,
                  currentFrame.paired && styles.statusBadgePaired
                ]}>
                  <Text style={styles.statusText}>
                    {currentFrame.paired ? '● Connected' : '○ Unpaired'}
                  </Text>
                </View>
              </View>

              <View style={styles.frameImageContainer}>
                {currentFrame.has_image ? (
                  <View style={styles.frameImagePlaceholder}>
                    <Text style={styles.frameImageText}>🖼️</Text>
                    <Text style={styles.frameImageSubtext}>Image Active</Text>
                  </View>
                ) : (
                  <View style={styles.frameImagePlaceholder}>
                    <Text style={styles.frameImageText}>📷</Text>
                    <Text style={styles.frameImageSubtext}>No Image Yet</Text>
                  </View>
                )}
              </View>

              <View style={styles.frameInfo}>
                <Text style={styles.frameInfoLabel}>MAC Address</Text>
                <Text style={styles.frameInfoValue}>{currentFrame.mac_address}</Text>
              </View>

              {currentFrame.last_image_upload && (
                <View style={styles.frameInfo}>
                  <Text style={styles.frameInfoLabel}>Last Updated</Text>
                  <Text style={styles.frameInfoValue}>
                    {new Date(currentFrame.last_image_upload).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>

            {/* Navigation Arrows */}
            {frames.length > 1 && (
              <>
                {currentFrameIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navArrow, styles.navArrowLeft]}
                    onPress={handlePreviousFrame}
                  >
                    <Text style={styles.navArrowText}>‹</Text>
                  </TouchableOpacity>
                )}

                {currentFrameIndex < frames.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navArrow, styles.navArrowRight]}
                    onPress={handleNextFrame}
                  >
                    <Text style={styles.navArrowText}>›</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Frame Counter */}
            {frames.length > 1 && (
              <View style={styles.frameCounter}>
                <Text style={styles.frameCounterText}>
                  {currentFrameIndex + 1} / {frames.length}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Add Frame Button (always visible when authenticated) */}
        {frames.length > 0 && (
          <TouchableOpacity
            style={styles.addFrameButton}
            onPress={handlePairFrame}
          >
            <Text style={styles.addFrameButtonText}>+ Add Another Frame</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  profileIconText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  button: {
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl * 2,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  frameCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    ...shadows.lg,
  },
  frameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  frameName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[200],
  },
  statusBadgePaired: {
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  frameImageContainer: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  frameImagePlaceholder: {
    alignItems: 'center',
  },
  frameImageText: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  frameImageSubtext: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  frameInfo: {
    marginTop: spacing.md,
  },
  frameInfoLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  frameInfoValue: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '600',
  },
  navArrow: {
    position: 'absolute',
    bottom: spacing.lg,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  navArrowLeft: {
    left: spacing.lg,
  },
  navArrowRight: {
    right: spacing.lg,
  },
  navArrowText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '700',
  },
  frameCounter: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    backgroundColor: colors.gray[800],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  frameCounterText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  addFrameButton: {
    height: 50,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderStyle: 'dashed',
  },
  addFrameButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
