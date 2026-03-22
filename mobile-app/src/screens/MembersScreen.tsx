import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Avatar, Searchbar, useTheme, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface Member {
  id: string;
  name: string;
  relationship: string;
  birthDate?: string;
  photo?: string;
}

export default function MembersScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  const [members] = useState<Member[]>([
    { id: '1', name: 'Jean Baptiste', relationship: 'Grandfather', birthDate: '1940' },
    { id: '2', name: 'Marie Moïse', relationship: 'Grandmother', birthDate: '1942' },
    { id: '3', name: 'Pierre Baptiste', relationship: 'Father', birthDate: '1965' },
    { id: '4', name: 'Claire Jean', relationship: 'Mother', birthDate: '1968' },
    { id: '5', name: 'Sophie Baptiste', relationship: 'Sister', birthDate: '1995' },
  ]);

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.relationship.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMember = ({ item }: { item: Member }) => (
    <Card style={styles.memberCard}>
      <Card.Content style={styles.memberContent}>
        <Avatar.Icon size={50} icon="account" />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.colors.onSurface }]}>
            {item.name}
          </Text>
          <Text style={[styles.memberRelation, { color: theme.colors.onSurfaceVariant }]}>
            {item.relationship}
          </Text>
          {item.birthDate && (
            <Text style={[styles.memberDate, { color: theme.colors.onSurfaceVariant }]}>
              Born: {item.birthDate}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search members..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <FlatList
        data={filteredMembers}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

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
  container: { flex: 1 },
  searchBar: { margin: 16, elevation: 2 },
  listContainer: { padding: 16 },
  memberCard: { marginBottom: 8 },
  memberContent: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  memberInfo: { flex: 1, marginLeft: 16 },
  memberName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  memberRelation: { fontSize: 14, marginBottom: 2 },
  memberDate: { fontSize: 12 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});