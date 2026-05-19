import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../config';

export default function AssignmentReport({ navigation, route }) {

  const {
    Assignment_num,
    course_no,
    semester_no,
    section,
    discipline,
    current_sem
  } = route.params;

  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    fetchReport();
  }, []);

  const handleShareResults = async () => {
  try {
    const studentsPayload = submissions.map(item => ({
             reg_no: item.reg_no,
             video_id: item.video_id
       }));

    const response = await fetch(`${BASE_URL}/teacher/share-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: studentsPayload })
    });

    const result = await response.json();

    if (result.message) {
      Alert.alert("Success", "Results shared successfully");
    } else {
      Alert.alert("Error", result.error || "Something went wrong");
    }

  } catch (error) {
    console.log(error);
    Alert.alert("Error", "Failed to share results");
  }
};

  const fetchReport = async () => {
    try {

      const response = await fetch(
        `${BASE_URL}/assignment/get-assignment-report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Assignment_no: parseInt(Assignment_num.split('-')[1]),
            course_no,
            Semester_no: semester_no,
            section,
            Discipline: discipline,
            current_sem
          }),
        }
      );

      const data = await response.json();

      console.log("API RESPONSE:", data);
      console.log(data.data)

      if (data.data) {

        const formatted = data.data.map((item, index) => ({
          id: index.toString(),
          name: item.name,
          reg_no: item.reg_no,
          video_id: item.Video_id,
          topic: item.topic,
          deadline: `${item.deadline_date} ${item.deadline_time}`,
          rating: `${item.award_score}/10`,
          review: item.video_uploaded === "Yes"
        }));

        setSubmissions(formatted);
      }

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to load report");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>

      {/* Student */}
      <View style={styles.col1}>
        <Text style={styles.nameText}>{item.name}</Text>
        <Text style={styles.idText}>{item.reg_no}</Text>
      </View>

      {/* Topic */}
      <View style={styles.col2}>
        <Text style={styles.topicText}>{item.topic}</Text>
        <Text style={styles.idText}>Due: {item.deadline}</Text>
      </View>

      {/* Rating */}
      <View style={styles.col3}>
        <Text style={[
          styles.ratingText,
          item.rating === '0/10' && { color: '#CCC' }
        ]}>
          {item.rating}
        </Text>
      </View>

      {/* Review */}
      <View style={styles.col4}>
        {item.review ? (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('TeacherEvaluationScreen', {
                  regNo: item.reg_no,
                  Assignment_num: Assignment_num,
                  course_no: course_no,
                  semester_no: semester_no,
                  section: section,
                  discipline: discipline,
                  current_sem:current_sem
              })
            }
          >
            <Icon name="play-circle-outline" size={24} color="#A855F7" />
          </TouchableOpacity>
        ) : (
          <Text style={styles.naText}>N/A</Text>
        )}
      </View>

    </View>
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="black" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{Assignment_num}</Text>

        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.mainTitle}>Submissions</Text>

      {/* TABLE HEADER */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerLabel}>STUDENT / ID</Text>
        <Text style={styles.headerLabel}>TOPIC & DEADLINE</Text>
        <Text style={styles.headerLabel}>RATING</Text>
        <Text style={styles.headerLabel}>REVIEWS</Text>
      </View>

      <FlatList
        data={submissions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
      />

      {/* FOOTER */}
      <TouchableOpacity
             style={styles.shareBtn}
             onPress={handleShareResults}   // ✅ yahan function lagao
      >
              <Text style={styles.shareBtnText}>Share results</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  backBtn: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  mainTitle: { fontSize: 24, fontWeight: 'bold', marginVertical: 25 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  headerLabel: { fontSize: 10, color: '#AAA', fontWeight: 'bold', width: '25%', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  col1: { width: '30%' },
  col2: { width: '35%' },
  col3: { width: '20%', alignItems: 'center' },
  col4: { width: '15%', alignItems: 'center' },
  nameText: { fontSize: 13, fontWeight: 'bold' },
  idText: { fontSize: 10, color: '#AAA' },
  topicText: { fontSize: 12, color: '#A855F7', fontWeight: '600' },
  ratingText: { fontSize: 12, fontWeight: 'bold' },
  naText: { fontSize: 12, color: '#DDD' },
  shareBtn: { backgroundColor: '#A855F7', padding: 18, borderRadius: 15, alignItems: 'center', marginVertical: 20 },
  shareBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});