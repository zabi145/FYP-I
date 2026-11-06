import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../config';

export default function CreateAssignment({ route, navigation }) {

  // ✅ Receive ALL params from previous screen
  const {
    courseTitle,
    courseCode,
    course_no,
    emp_no,
    semester_no,
    section,
    discipline,
    current_sem
  } = route.params;

  const [assignments, setAssignments] = useState([]);

  // ✅ Load assignments on screen open
  useEffect(() => {
    fetchAssignments();
  }, []);

  // ✅ API CALL
  const fetchAssignments = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/assignment/get-assignments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emp_no,
            course_no,
            semester_no,
            section,
            discipline,
            current_sem
          }),
        }
      );

      const data = await response.json();

      console.log("Assignments API:", data);

      if (data.assignments) {

        // 🔥 Sort + format
        const formatted = data.assignments
          .sort((a, b) => a.Assignment_no - b.Assignment_no)
          .map((item) => ({
            id: item.Assignment_id.toString(),
            title: `Assignment-${item.Assignment_no}`,
          }));

        setAssignments(formatted);
      }

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to load assignments");
    }
  };

  // ✅ CREATE ASSIGNMENT (AUTO INCREMENT)
  const handleCreateAssignment = () => {

    let nextNumber = 1;

    if (assignments.length > 0) {
      const lastAssignment = assignments[assignments.length - 1];

      const lastNumber = parseInt(lastAssignment.title.split('-')[1]);

      nextNumber = lastNumber + 1;
    }

    const newAssignment = {
      id: Date.now().toString(),
      title: `Assignment-${nextNumber}`,
    };

    setAssignments([...assignments, newAssignment]);
  };

  // ✅ Render item
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.assignmentCard}
      onPress={() =>
        navigation.navigate('ShareAssignment', {
          Assignment_num: item.title,
          emp_no,
          course_no,
          semester_no,
          section,
          discipline,
          current_sem
        })
      }
    >
      <Text style={styles.assignmentText}>{item.title}</Text>
      <Icon name="chevron-forward" size={18} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{courseTitle}</Text>
          <Text style={styles.subTitle}>{courseCode}</Text>
        </View>
      </View>

      <View style={{ height: 620 }}>
      {/* CREATE BUTTON */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={handleCreateAssignment}
      >
        <Text style={styles.createBtnText}>Create Assignment</Text>
      </TouchableOpacity>

      {/* ASSIGNMENTS LIST */}
      <FlatList
        data={assignments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
      </View>

      <View>
      <TouchableOpacity
        style={styles.viewProgressBtn}
        onPress={() => navigation.navigate('ViewProgress', {
          emp_no,
          course_no,
          semester_no,
          section,
          discipline,
          current_sem,
          courseTitle,
          courseCode
        })}
      >
        <Text style={styles.reportText}>View Progress</Text>
      </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  viewProgressBtn: {
    backgroundColor: '#A855F7',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 30,
    width: '300',
    alignSelf: 'center' 
  },

  viewReportBtn: {
  backgroundColor: '#A855F7',
  padding: 18,
  borderRadius: 15,
  alignItems: 'center',
  marginTop: 30
},

reportText: {
  color: '#FFF',
  fontWeight: 'bold',
  fontSize: 16
},

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 25,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },

  backButton: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 25,
  },

  titleContainer: {
    marginLeft: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },

  subTitle: {
    fontSize: 14,
    color: '#666',
  },

  createBtn: {
    backgroundColor: '#A855F7',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 40,
  },

  createBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  assignmentCard: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
  },

  assignmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});