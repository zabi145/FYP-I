import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet ,Alert} from 'react-native';
import { BASE_URL } from '../config';

const AddGarden = () => {
  const [id,setid] = useState('')
  const [name,setname] = useState('')
  const [location,setlocation] = useState('')
  const [size,setsize] = useState('')


  const SaveGarden = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/Flower/addGarden`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' 
       },
      body: JSON.stringify({
        GardenId: parseInt(id),
        GardenName: name,
        Location: location,
        Size: parseInt(size)
      })
    });

    const text = await response.text();
    if (response.ok) {
      Alert.alert("Success", "Garden Added!");
    } else {
      Alert.alert("Error", text);
    }
  } catch (error) {
    console.log('Error:', error.message);
    Alert.alert("Error", "Server not reachable: " + error.message);
  }
}
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Add Garden</Text>

      <Text style={styles.label}>Garden ID *</Text>
      <TextInput style={styles.input} placeholder="Enter garden ID" onChangeText={setid} />

      <Text style={styles.label}>Garden Name *</Text>
      <TextInput style={styles.input} placeholder="Enter garden name" onChangeText={setname} />

      <Text style={styles.label}>Location *</Text>
      <TextInput style={styles.input} placeholder="Enter location" onChangeText={setlocation}/>

      <Text style={styles.label}>Size (in sq. ft.) *</Text>
      <TextInput style={styles.input} placeholder="Enter size" keyboardType="numeric" onChangeText={setsize}/>

      <TouchableOpacity onPress={SaveGarden} style={styles.button}>
        <Text style={styles.buttonText}>Save Garden</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'white', justifyContent: 'center' },
  header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  label: { fontWeight: 'bold', marginBottom: 5, marginTop: 15 },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    padding: 12, 
    borderRadius: 8, 
    backgroundColor: '#fafafa' 
  },
  button: { 
    backgroundColor: '#5e43d3', 
    padding: 15, 
    borderRadius: 8, 
    marginTop: 40, 
    alignItems: 'center' 
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default AddGarden;