import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../config';

export default function TaskScreen({ navigation, route }) {

    const {
        course_no,
        discipline,
        reg_no,
        section,
        semester_no,
        current_sem
    } = route.params;

    const [tasks, setTasks] = useState([]);

    // ✅ LOAD API ON SCREEN OPEN
    useEffect(() => {
        fetchTasks();
    }, []);

    // ✅ API CALL
    const fetchTasks = async () => {
        try {
            const response = await fetch(
                `${BASE_URL}/student/fetch-assignments`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        reg_no,
                        course_no,
                        section,
                        semester_no,
                        discipline,
                        current_sem
                    }),
                }
            );

            const data = await response.json();

            console.log("TASK API:", data);

            if (data.assignments) {
                setTasks(data.assignments);
            }

        } catch (error) {
            console.log(error);
            Alert.alert("Error", "Failed to load tasks");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="chevron-back" size={28} color="black" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Assigned Tasks</Text>

                <View style={{ width: 40 }} />
            </View>

            {/* TASK LIST */}
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {tasks.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginTop: 50 }}>
                        No Tasks Available
                    </Text>
                ) : (

                    tasks.map((task) => (
                        <View key={task.assignment_id} style={styles.taskCard}>
                            {task.video_id === null ? (
                                <Text style={{ color: 'white', fontWeight: 'bold', backgroundColor: 'red',width: '150', textAlign: 'center' ,borderRadius: 15,fontSize: 16,padding: 5}}>pending</Text>
                            ) : (
                                <Text style={{ color: 'white', fontWeight: 'bold', backgroundColor: 'green',width: '150', textAlign: 'center' ,borderRadius: 15,fontSize: 16,padding: 5}}>submitted</Text>
                            )}
                            
                            <Text style={styles.taskTitle}>
                                {task.topic}
                            </Text>

                            <Text style={styles.deadlineText}>
                                Deadline: {task.deadline_date} - {task.deadline_time}
                            </Text>

                            <TouchableOpacity
                                style={styles.detailsBtn}
                                onPress={() =>
                                     navigation.navigate('VideoUploadScreen', {
                                        assignment_id: task.assignment_id,
                                        topic: task.topic,
                                        topic_description: task.topic_description,
                                        deadline_date: task.deadline_date,
                                        deadline_time: task.deadline_time,
                                        reg_no,
                                        course_no,
                                        section,
                                        semester_no,
                                        discipline
                                      })
                                    }
                            >
                                <Text style={styles.detailsBtnText}>
                                    Show Details
                                </Text>
                            </TouchableOpacity>

                        </View>
                    ))

                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        // Screenshot ke mutabik border bottom thora light rakha hai
    },
    backBtn: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 40,
    },
    taskCard: {
        backgroundColor: '#F9FAFB', 
        borderRadius: 25,
        padding: 25,
        marginBottom: 30,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    taskTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#000',
        marginBottom: 8,
    },
    deadlineText: {
        fontSize: 13,
        color: '#6B7280', 
        marginBottom: 25,
    },
    detailsBtn: {
        backgroundColor: '#A855F7', 
        width: '100%',
        paddingVertical: 18,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    detailsBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
