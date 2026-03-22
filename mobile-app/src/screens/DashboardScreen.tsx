import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  useTheme,
  ProgressBar,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalMembers: number;
  generations: number;
  photosUploaded: number;
  storiesAdded: number;
  recentActivity: Array<{
    id: string;
    type: 'member_added' | 'photo_uploaded' | 'story_added';
    message: string;
    timestamp: Date;
  }>;
  treeCompletion: number;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, familyTreeId } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 12,
    generations: 4,
    photosUploaded: 28,
    storiesAdded: 5,
    recentActivity: [
      {
        id: '1',
        type: 'member_added',
        message: 'Added Marie Jean-Baptiste to family tree',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: '2',
        type: 'photo_uploaded',
        message: 'Uploaded photo for Pierre Moïse',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: '3',
        type: 'story_added',
        message: 'Added story: "Migration to Port-au-Prince"',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ],
    treeCompletion: 0.65,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'member_added': return 'person-add-outline';
      case 'photo_uploaded': return 'camera-outline';
      case 'story_added': return 'book-outline';
      default: return 'ellipse-outline';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Card */}
        <Card style={[styles.welcomeCard, { backgroundColor: theme.colors.primary }]}>
          <Card.Content style={styles.welcomeContent}>
            <View style={styles.welcomeText}>
              <Text style={[styles.welcomeTitle, { color: theme.colors.onPrimary }]}>
                Bonjou {user?.displayName?.split(' ')[0] || 'Friend'}! 👋
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.colors.onPrimary }]}>
                Welcome to your family heritage dashboard
              </Text>
            </View>
            <Avatar.Icon
              size={60}
              icon="family-tree"
              style={{ backgroundColor: theme.colors.primaryContainer }}
            />
          </Card.Content>
        </Card>

        {/* Tree Completion Progress */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Family Tree Progress
            </Text>
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
                {Math.round(stats.treeCompletion * 100)}% Complete
              </Text>
              <ProgressBar
                progress={stats.treeCompletion}
                color={theme.colors.tertiary}
                style={styles.progressBar}
              />
              <Text style={[styles.progressHint, { color: theme.colors.onSurfaceVariant }]}>
                Add more family members to complete your tree
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
            <Card.Content style={styles.statContent}>
              <Ionicons name="people-outline" size={32} color={theme.colors.primary} />
              <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>
                {stats.totalMembers}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Members
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
            <Card.Content style={styles.statContent}>
              <Ionicons name="git-network-outline" size={32} color={theme.colors.secondary} />
              <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>
                {stats.generations}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Generations
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
            <Card.Content style={styles.statContent}>
              <Ionicons name="camera-outline" size={32} color={theme.colors.tertiary} />
              <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>
                {stats.photosUploaded}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Photos
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
            <Card.Content style={styles.statContent}>
              <Ionicons name="book-outline" size={32} color={theme.colors.primary} />
              <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>
                {stats.storiesAdded}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Stories
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Quick Actions
            </Text>
            <View style={styles.actionsContainer}>
              <Button
                mode="contained"
                icon="person-add"
                onPress={() => navigation.navigate('AddMember' as never)}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                Add Member
              </Button>
              <Button
                mode="outlined"
                icon="camera"
                onPress={() => {}}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                Add Photo
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Recent Activity
            </Text>
            {stats.recentActivity.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIconContainer}>
                  <Ionicons
                    name={getActivityIcon(activity.type) as any}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityMessage, { color: theme.colors.onSurface }]}>
                    {activity.message}
                  </Text>
                  <Text style={[styles.activityTime, { color: theme.colors.onSurfaceVariant }]}>
                    {formatTimeAgo(activity.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Tips Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Did You Know?
            </Text>
            <View style={styles.tipContainer}>
              <Ionicons name="bulb-outline" size={24} color={theme.colors.tertiary} />
              <Text style={[styles.tipText, { color: theme.colors.onSurfaceVariant }]}>
                You can share your family tree with relatives by going to Settings and enabling collaboration.
              </Text>
            </View>
            <Chip icon="arrow-right" onPress={() => {}}>
              Learn More
            </Chip>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  welcomeCard: {
    marginBottom: 16,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressHint: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    marginBottom: 0,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 33, 125, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});