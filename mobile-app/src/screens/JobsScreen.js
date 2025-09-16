import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {useAuth} from '../context/AuthContext';
import apiService from '../services/apiService';

const JobsScreen = () => {
  const [jobs, setJobs] = useState([]);
  const {user} = useAuth();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await apiService.get('/public/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const renderJob = ({item}) => (
    <View style={styles.jobCard}>
      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.jobDescription}>
        {(item.shortDescription || item.description || '').replace(/<[^>]+>/g, '').trim()}
      </Text>
      <TouchableOpacity style={styles.applyButton}>
        <Text style={styles.applyButtonText}>
          {user ? 'Bewerben' : 'Einloggen zum Bewerben'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Offene Stellen</Text>
      <Text style={styles.subheader}>
        Finde deinen Platz in der süßesten Manufaktur der Welt.
      </Text>
      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={item => item.id}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f172a', padding: 16},
  header: {fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8},
  subheader: {fontSize: 16, color: '#94a3b8', marginBottom: 20},
  list: {flex: 1},
  jobCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  jobTitle: {fontSize: 18, fontWeight: '600', color: '#f8fafc', marginBottom: 8},
  jobDescription: {fontSize: 14, color: '#94a3b8', marginBottom: 12},
  applyButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  applyButtonText: {color: 'white', fontWeight: '500'},
});

export default JobsScreen;
