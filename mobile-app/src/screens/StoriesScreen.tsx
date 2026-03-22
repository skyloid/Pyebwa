import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Avatar, FAB, useTheme, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Story {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  tags: string[];
}

export default function StoriesScreen() {
  const theme = useTheme();

  const [stories] = useState<Story[]>([
    {
      id: '1',
      title: 'Migration to Port-au-Prince',
      excerpt: 'The story of how our family moved from the countryside to the capital...',
      author: 'Pierre Baptiste',
      date: '2023-01-15',
      tags: ['Migration', 'History'],
    },
    {
      id: '2',
      title: 'Wedding Day Memories',
      excerpt: 'The beautiful wedding ceremony of Jean and Marie in 1962...',
      author: 'Marie Moïse',
      date: '2023-02-20',
      tags: ['Wedding', 'Love'],
    },
  ]);

  const renderStory = ({ item }: { item: Story }) => (
    <Card style={styles.storyCard}>
      <Card.Content style={styles.storyContent}>
        <Text style={[styles.storyTitle, { color: theme.colors.onSurface }]}>
          {item.title}
        </Text>
        <Text style={[styles.storyExcerpt, { color: theme.colors.onSurfaceVariant }]}>
          {item.excerpt}
        </Text>
        <View style={styles.storyMeta}>
          <Text style={[styles.storyAuthor, { color: theme.colors.onSurfaceVariant }]}>
            By {item.author} • {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.tagsContainer}>
          {item.tags.map((tag) => (
            <Chip key={tag} style={styles.tag} compact>
              {tag}
            </Chip>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={stories}
        renderItem={renderStory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {}}
        label="Add Story"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { padding: 16 },
  storyCard: { marginBottom: 16 },
  storyContent: { padding: 16 },
  storyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  storyExcerpt: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  storyMeta: { marginBottom: 8 },
  storyAuthor: { fontSize: 12 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { marginRight: 4, marginBottom: 4 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});