
// import React, { useState } from 'react';
// import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
// import { BASE_URL } from '../config';

// const AddFlower = () => {
//   const [id, setid] = useState('')
//   const [name, setname] = useState('')
//   const [color, setcolor] = useState('')
//   const [price, setprice] = useState('')
//   const [gardenId, setgardenId] = useState('')

//   const SaveFlower = async () => {
//     try {
//       const response = await fetch(`${BASE_URL}/api/Flower/addFlower`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json',
//           'ngrok-skip-browser-warning': 'true' 
//          },
//         body: JSON.stringify({
//           FlowerId: parseInt(id),
//           FlowerName: name,
//           Color: color,
//           Price: parseFloat(price),
//           GardenId: parseInt(gardenId)
//         })
//       });

//       const text = await response.text();
//       if (response.ok) {
//         Alert.alert("Success", "Flower Added!");
//       } else {
//         Alert.alert("Error", text);
//       }
//     } catch (error) {
//       Alert.alert("Error", "Server not reachable: " + error.message);
//     }
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.header}>Add Flower</Text>

//       <Text style={styles.label}>Flower ID *</Text>
//       <TextInput style={styles.input} placeholder="Enter flower ID"
//         keyboardType="numeric" onChangeText={setid} />

//       <Text style={styles.label}>Flower Name *</Text>
//       <TextInput style={styles.input} placeholder="Enter flower name"
//         onChangeText={setname} />

//       <Text style={styles.label}>Color *</Text>
//       <TextInput style={styles.input} placeholder="Enter color"
//         onChangeText={setcolor} />

//       <Text style={styles.label}>Price *</Text>
//       <TextInput style={styles.input} placeholder="Enter price"
//         keyboardType="numeric" onChangeText={setprice} />

//       <Text style={styles.label}>Garden ID *</Text>
//       <TextInput style={styles.input} placeholder="Enter garden ID"
//         keyboardType="numeric" onChangeText={setgardenId} />

//       <TouchableOpacity style={styles.button} onPress={SaveFlower}>
//         <Text style={styles.buttonText}>Save Flower</Text>
//       </TouchableOpacity>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, backgroundColor: 'white', justifyContent: 'center' },
//   header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
//   label: { fontWeight: 'bold', marginBottom: 5, marginTop: 15 },
//   input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, backgroundColor: '#fafafa' },
//   button: { backgroundColor: '#5e43d3', padding: 15, borderRadius: 8, marginTop: 40, alignItems: 'center' },
//   buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
// });

// export default AddFlower;


import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { BASE_URL } from '../config';

const AddFlower = () => {
  const [id, setid] = useState('')
  const [name, setname] = useState('')
  const [color, setcolor] = useState('')
  const [price, setprice] = useState('')
  const [gardenId, setgardenId] = useState('')
  const [imageBase64, setimageBase64] = useState('')
  const [imageUri, setimageUri] = useState(null)

  const pickImage = () => {
    launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.5
    }, (response) => {
      if (!response.didCancel && !response.errorCode) {
        setimageUri(response.assets[0].uri)
        setimageBase64(response.assets[0].base64)
      }
    });
  }

  const SaveFlower = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/Flower/addFlower`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          FlowerId: parseInt(id),
          FlowerName: name,
          Color: color,
          Price: parseFloat(price),
          GardenId: parseInt(gardenId),
          ImageBase64: imageBase64
        })
      });

      if (response.ok) {
        Alert.alert("Success", "Flower Added!");
      } else {
        Alert.alert("Error", "Status: " + response.status);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Add Flower</Text>

      <Text style={styles.label}>Flower ID *</Text>
      <TextInput style={styles.input} placeholder="Enter flower ID"
        keyboardType="numeric" onChangeText={setid} />

      <Text style={styles.label}>Flower Name *</Text>
      <TextInput style={styles.input} placeholder="Enter flower name"
        onChangeText={setname} />

      <Text style={styles.label}>Color *</Text>
      <TextInput style={styles.input} placeholder="Enter color"
        onChangeText={setcolor} />

      <Text style={styles.label}>Price *</Text>
      <TextInput style={styles.input} placeholder="Enter price"
        keyboardType="numeric" onChangeText={setprice} />

      <Text style={styles.label}>Garden ID *</Text>
      <TextInput style={styles.input} placeholder="Enter garden ID"
        keyboardType="numeric" onChangeText={setgardenId} />

      <Text style={styles.label}>Flower Image</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.imagePlaceholder}>📷 Choose Image</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={SaveFlower}>
        <Text style={styles.buttonText}>Save Flower</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'white' },
  header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, marginTop: 20 },
  label: { fontWeight: 'bold', marginBottom: 5, marginTop: 15 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, backgroundColor: '#fafafa' },
  imagePicker: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    height: 150, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fafafa', marginTop: 5
  },
  image: { width: '100%', height: '100%', borderRadius: 8 },
  imagePlaceholder: { fontSize: 16, color: 'gray' },
  button: { backgroundColor: '#5e43d3', padding: 15, borderRadius: 8, marginTop: 30, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default AddFlower;