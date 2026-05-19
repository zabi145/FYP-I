import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

const AdminHome = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Flower Garden</Text>
      
      <View style={styles.welcomeSection}>
        <Text style={styles.title}>Welcome, Admin!</Text>
        <Text style={styles.subtitle}>Manage your gardens, flowers and gardeners.</Text>
      </View>

      {/* Add Garden Button - Navigation added here */}
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: '#f0fff0' }]}
        onPress={() => navigation.navigate('AddGarden')}
      >
        <Text style={styles.cardText}>Add Garden</Text>
      </TouchableOpacity>

      {/* Add Flower Button - Navigation added here */}
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: '#fff0f5' }]}
        onPress={() => navigation.navigate('AddFlower')}
      >
        <Text style={styles.cardText}>Add Flower</Text>
      </TouchableOpacity>

      {/* Add Gardener Button (Placeholder) */}
      <TouchableOpacity style={[styles.card, { backgroundColor: '#fffaf0' }]}
       onPress={() => navigation.navigate('AddGardener')}>
        <Text style={styles.cardText}>Add Gardener</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ... Styles wahi purane wale rahen ge ...
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'white' },
  header: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 30 },
  welcomeSection: { marginBottom: 30 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: 'gray', marginTop: 5 },
  card: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderRadius: 10, marginBottom: 15, alignItems: 'center' },
  cardText: { fontSize: 18, fontWeight: '600' }
});

export default AdminHome;