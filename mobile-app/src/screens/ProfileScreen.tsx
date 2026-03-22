import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Avatar, Button, List, useTheme, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: signOut, style: 'destructive' },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Icon size={80} icon="account" />
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
                {user?.displayName || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
                {user?.email}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Settings
            </Text>
            
            <List.Item
              title="Edit Profile"
              description="Update your personal information"
              left={(props) => <List.Icon {...props} icon="account-edit" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            
            <Divider />
            
            <List.Item
              title="Family Tree Settings"
              description="Manage privacy and sharing"
              left={(props) => <List.Icon {...props} icon="cog" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            
            <Divider />
            
            <List.Item
              title="Notifications"
              description="Manage your notification preferences"
              left={(props) => <List.Icon {...props} icon="bell" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
          </Card.Content>
        </Card>

        {/* App Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              About
            </Text>
            
            <List.Item
              title="Help & Support"
              left={(props) => <List.Icon {...props} icon="help-circle" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            
            <Divider />
            
            <List.Item
              title="Privacy Policy"
              left={(props) => <List.Icon {...props} icon="shield-account" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            
            <Divider />
            
            <List.Item
              title="App Version"
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information" />}
            />
          </Card.Content>
        </Card>

        {/* Sign Out */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="outlined"
              onPress={handleSignOut}
              icon="logout"
              textColor={theme.colors.error}
              style={[styles.signOutButton, { borderColor: theme.colors.error }]}
            >
              Sign Out
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, padding: 16 },
  profileCard: { marginBottom: 16 },
  profileContent: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  profileInfo: { flex: 1, marginLeft: 16 },
  userName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  userEmail: { fontSize: 14 },
  card: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  signOutButton: { marginTop: 8 },
});