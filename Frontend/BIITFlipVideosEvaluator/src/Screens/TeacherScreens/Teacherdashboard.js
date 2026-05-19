import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import { RadioButton } from 'react-native-paper';
import { BASE_URL } from '../../config';

const Teacherdashboard = ({ navigation, route }) => {

  const userId = route?.params?.userId;

  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [currentSem, setCurrentSem] = useState(null);

  // 🔥 Load API on screen open
  useEffect(() => {
    fetchTeacherDashboard();
  }, []);

  // 🔥 API CALL
  const fetchTeacherDashboard = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/teacher/teacher-dashboard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        }
      );

      const data = await response.json();

      console.log('Dashboard Data:', data);

      if (data.message) {
        Alert.alert('Error', data.message);
        return;
      }

      // 👇 teacher name
      setTeacherName(data.teacher.full_name);
      setCurrentSem(data.current_sem);

      // 👇 formatted courses (IMPORTANT PART)
   const formattedCourses = data.courses.map((item, index) => ({
       id: index.toString(),

        title: item.course_name,

         code: `${item.discipline} - (${item.batch_semester_no}) ${item.section}`,

      // ⭐ IMPORTANT: original API values preserve karo
          emp_no: data.teacher.emp_no,
          course_no: item.course_no,
          semester_no: item.batch_semester_no,
          section: item.section,
          discipline: item.discipline
    }));
      setCourses(formattedCourses);
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to load dashboard');
    }
  };

  // 🔥 Logout
  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ 
        name: 'Login' }],
    });
  };

  // 🔥 Render each course card
  const renderItem = ({ item }) => {
    const isSelected = item.id === selectedId;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setSelectedId(item.id);

          navigation.navigate('CreateAssignment', {
            courseTitle: item.title,
            courseCode:item.code,
            course_no:item.course_no,
            emp_no:item.emp_no,
            discipline:item.discipline,
            semester_no:item.semester_no,
            section:item.section,
            current_sem: currentSem 
          });
        }}
        style={[styles.card, isSelected && styles.selectedCard]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>

          {/* 🔥 FINAL FORMAT SHOWN HERE */}
          <Text style={styles.cardCode}>{item.code}</Text>
        </View>

        <RadioButton
          value={item.id}
          status={isSelected ? 'checked' : 'unchecked'}
          onPress={() => setSelectedId(item.id)}
          color="#A855F7"
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.mainHeader}>Dashboard</Text>

      <View style={styles.welcomeBox}>
        <Text style={styles.helloText}>
          Hello! {teacherName}
        </Text>
        <Text style={styles.subText}>
          Welcome to your dashboard
        </Text>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>
          Allocate Subjects
        </Text>

        <FlatList
          data={courses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
        />
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 25,
  },

  mainHeader: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 20,
  },

  welcomeBox: {
    marginTop: 20,
  },

  helloText: {
    fontSize: 30,
    fontWeight: 'bold',
  },

  subText: {
    fontSize: 16,
    color: '#666',
  },

  listSection: {
    flex: 1,
    marginTop: 30,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },

  card: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EEE',
  },

  selectedCard: {
    borderColor: '#A855F7',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  cardCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },

  logoutBtn: {
    backgroundColor: '#A855F7',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 30,
  },

  logoutText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Teacherdashboard;