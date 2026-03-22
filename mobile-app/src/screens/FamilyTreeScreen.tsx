import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import {
  Text,
  FAB,
  Searchbar,
  SegmentedButtons,
  Card,
  Avatar,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  birthDate?: string;
  photo?: string;
  x: number;
  y: number;
  generation: number;
}

export default function FamilyTreeScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  
  const [viewMode, setViewMode] = useState('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [scale] = useState(new Animated.Value(1));
  const [pan] = useState(new Animated.ValueXY());

  // Sample family data
  const [familyMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Jean Baptiste', relationship: 'Grandfather', x: width/2 - 50, y: 50, generation: 1 },
    { id: '2', name: 'Marie Moïse', relationship: 'Grandmother', x: width/2 + 50, y: 50, generation: 1 },
    { id: '3', name: 'Pierre Baptiste', relationship: 'Father', x: width/2 - 100, y: 200, generation: 2 },
    { id: '4', name: 'Claire Jean', relationship: 'Mother', x: width/2, y: 200, generation: 2 },
    { id: '5', name: 'Michel Baptiste', relationship: 'Uncle', x: width/2 + 100, y: 200, generation: 2 },
    { id: '6', name: 'You', relationship: 'Self', x: width/2 - 50, y: 350, generation: 3 },
    { id: '7', name: 'Sophie Baptiste', relationship: 'Sister', x: width/2 + 50, y: 350, generation: 3 },
  ]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      // Handle panning
      pan.setValue({ x: gestureState.dx, y: gestureState.dy });
    },
    onPanResponderRelease: () => {
      // Reset pan
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
    },
  });

  const filteredMembers = familyMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.relationship.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTreeView = () => (
    <Animated.View 
      style={[
        styles.treeContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Connection Lines */}
      <View style={styles.connectionsContainer}>
        {/* Add SVG lines or custom drawn connections here */}
      </View>

      {/* Family Members */}
      {filteredMembers.map((member) => (
        <Animated.View
          key={member.id}
          style={[
            styles.memberNode,
            {
              left: member.x,
              top: member.y,
            },
          ]}
        >
          <Card style={styles.memberCard}>
            <Card.Content style={styles.memberContent}>
              <Avatar.Icon
                size={40}
                icon="account"
                style={{ backgroundColor: theme.colors.primaryContainer }}
              />
              <Text style={[styles.memberName, { color: theme.colors.onSurface }]}>
                {member.name}
              </Text>
              <Text style={[styles.memberRelation, { color: theme.colors.onSurfaceVariant }]}>
                {member.relationship}
              </Text>
            </Card.Content>
          </Card>
        </Animated.View>
      ))}
    </Animated.View>
  );

  const renderListView = () => (
    <ScrollView style={styles.listContainer}>
      {[1, 2, 3].map(generation => {
        const generationMembers = filteredMembers.filter(m => m.generation === generation);
        if (generationMembers.length === 0) return null;

        return (
          <View key={generation} style={styles.generationSection}>
            <Text style={[styles.generationTitle, { color: theme.colors.primary }]}>
              Generation {generation}
            </Text>
            {generationMembers.map((member) => (
              <Card key={member.id} style={styles.memberListCard}>
                <Card.Content style={styles.memberListContent}>
                  <Avatar.Icon
                    size={50}
                    icon="account"
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                  />
                  <View style={styles.memberDetails}>
                    <Text style={[styles.memberListName, { color: theme.colors.onSurface }]}>
                      {member.name}
                    </Text>
                    <Text style={[styles.memberListRelation, { color: theme.colors.onSurfaceVariant }]}>
                      {member.relationship}
                    </Text>
                    {member.birthDate && (
                      <Text style={[styles.memberListDate, { color: theme.colors.onSurfaceVariant }]}>
                        Born: {member.birthDate}
                      </Text>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search family members..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* View Mode Selector */}
      <View style={styles.modeContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={setViewMode}
          buttons={[
            { value: 'tree', label: 'Tree View', icon: 'git-network' },
            { value: 'list', label: 'List View', icon: 'format-list-bulleted' },
          ]}
        />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {viewMode === 'tree' ? renderTreeView() : renderListView()}
      </View>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddMember' as never)}
        label="Add Member"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 2,
  },
  modeContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contentContainer: {
    flex: 1,
  },
  treeContainer: {
    flex: 1,
    position: 'relative',
    minHeight: height * 2,
    minWidth: width * 2,
  },
  connectionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  memberNode: {
    position: 'absolute',
    width: 120,
    height: 140,
  },
  memberCard: {
    width: '100%',
    height: '100%',
  },
  memberContent: {
    alignItems: 'center',
    padding: 8,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  memberRelation: {
    fontSize: 10,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  generationSection: {
    marginBottom: 24,
  },
  generationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  memberListCard: {
    marginBottom: 8,
  },
  memberListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  memberDetails: {
    flex: 1,
    marginLeft: 16,
  },
  memberListName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberListRelation: {
    fontSize: 14,
    marginBottom: 2,
  },
  memberListDate: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});