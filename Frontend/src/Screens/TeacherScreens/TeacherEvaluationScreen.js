import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    SafeAreaView, 
    ScrollView, 
    Alert,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import Video from "react-native-video";
import { BASE_URL } from '../../config';

export default function TeacherEvaluationScreen({ route, navigation }) {
    
    const { regNo, Assignment_num, course_no } = route.params;

    const [neck, setNeck] = useState(0);
    const [eyes, setEyes] = useState(0);
    const [vibe, setVibe] = useState(0);
    const [relevance, setRelevance] = useState(0);
    const [isFaceVerified, setIsFaceVerified] = useState(false);
    const [videoPath, setVideoPath] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resetneck, setResetNeck] = useState();
    const [reseteyes, setResetEyes] = useState();
    const [resetvibe, setResetVibe] = useState();
    const [resetrelevance, setResetRelevance] = useState();

    // ✅ LOAD DATA
    useEffect(() => {
        fetchVideoDetails();
    }, []);

    const fetchVideoDetails = async () => {
        try {
            const assignmentId = Assignment_num.toString().includes('-')
                ? parseInt(Assignment_num.split('-')[1])
                : Assignment_num;

            const response = await fetch(
                `${BASE_URL}/assignment/get-teacher-side-videos`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Assignment_no: assignmentId,
                        reg_no: regNo,
                        course_no: course_no,
                        Semester_no: route.params.semester_no,
                        section: route.params.section,
                        Discipline: route.params.discipline,
                        current_sem: route.params.current_sem
                    }),
                }
            );

            const data = await response.json();

            console.log("VIDEO API:", data);

//             console.log("Sending to API:", {
//     Assignment_no: assignmentId,
//     reg_no: regNo,
//     course_no: course_no,
//     Semester_no: route.params.semester_no,
//     section: route.params.section,
//     Discipline: route.params.discipline,
//     current_sem: route.params.current_sem
// });

            if (data.video_path) {

                const fullVideoUrl = `${BASE_URL}/videos/${data.video_path}`;

                setVideoPath(fullVideoUrl);
                setNeck(data.neck_movement || 0);
                setEyes(data.eye_contact || 0);
                setVibe(data.confidence || 0);
                setIsFaceVerified(data.face_verification === "Yes");
                setRelevance(data.topic_relevance || 0);
                setResetNeck(data.neck_movement || 0);
                setResetEyes(data.eye_contact || 0);
                setResetVibe(data.confidence || 0);
                setResetRelevance(data.topic_relevance || 0);
            }

        } catch (error) {
            console.log(error);
            Alert.alert("Error", "Failed to load video data");
        }
    };

    // ✅ SAVE CHANGES API
    const handleSaveChanges = async () => {

        const assignmentId = Assignment_num.toString().includes('-')
            ? parseInt(Assignment_num.split('-')[1])
            : Assignment_num;

        setLoading(true);

        try {
            const response = await fetch(
                `${BASE_URL}/teacher/save-changes`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        regNo: regNo,
                        Assignment_num: assignmentId,
                        course_no: course_no,
                        neck_movement: neck,
                        eye_contact: eyes,
                        confidence_score: vibe,
                        topic_relevance: relevance,
                        face_verification: isFaceVerified ? 1 : 0
                    }),
                }
            );

            const data = await response.json();

            console.log("SAVE API:", data);

            if (data.message) {
                Alert.alert("Success", "Scores updated successfully");

            } else {
                Alert.alert("Error", data.error || "Update failed");
            }

        } catch (error) {
            console.log(error);
            Alert.alert("Error", "Failed to save changes");
        } finally {
            setLoading(false);
        }
    };

    // ✅ METRIC CARD COMPONENT
    const MetricCard = ({ label, subLabel, value, setValue }) => (
        <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricSubLabel}>{subLabel}</Text>
            
            <View style={styles.sliderRow}>
                <TouchableOpacity 
                    onPress={() => setValue(Math.max(0, value - 1))} 
                    style={styles.stepBtn}
                >
                    <Icon name="remove-outline" size={20} />
                </TouchableOpacity>
                
                <Slider
                    style={{ flex: 1 }}
                    minimumValue={0}
                    maximumValue={100}
                    value={value}
                    onValueChange={(val) => setValue(Math.floor(val))}
                    minimumTrackTintColor="#A855F7"
                    maximumTrackTintColor="#F3F4F6"
                    thumbTintColor="#A855F7"
                />

                <TouchableOpacity 
                    onPress={() => setValue(Math.min(100, value + 1))} 
                    style={styles.stepBtn}
                >
                    <Icon name="add-outline" size={20} />
                </TouchableOpacity>

                <Text style={styles.valuePercentage}>{value}%</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="chevron-back" size={24} />
                </TouchableOpacity>
                <Text style={styles.regNoText}>{regNo}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* VIDEO */}
                <View style={styles.videoPlayer}>
                    {videoPath ? (
                        <Video
                            source={{ uri: videoPath }}
                            style={styles.video}
                            controls
                            resizeMode="contain"
                        />
                    ) : (
                        <Text style={styles.noVideoText}>No Video</Text>
                    )}
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <View>   
                <Text style={styles.sectionTitle}>Evaluation</Text>
                </View>   

                <View>
                <TouchableOpacity style={styles.resetBtn} onPress={() => {
                    setNeck(resetneck);
                    setEyes(reseteyes);
                    setVibe(resetvibe);
                    setRelevance(resetrelevance);
                }}>
                    <Text style={{ color: '#fff' }}>Reset</Text>
                </TouchableOpacity>
                </View>

                </View>

                <MetricCard label=" " subLabel="Neck Stability" value={neck} setValue={setNeck} />
                <MetricCard label=" " subLabel="Eye Contact" value={eyes} setValue={setEyes} />
                <MetricCard label=" " subLabel="Communication" value={vibe} setValue={setVibe} />
                <MetricCard label=" " subLabel="Topic Relevance" value={relevance} setValue={setRelevance} />
                
                {/* FACE VERIFIED */}
                <View style={styles.metricCard}>
                    <View style={styles.rowBetween}>
                        <View>
                            {/* <Text style={styles.metricLabel}>ID</Text> */}
                            <Text style={styles.metricSubLabel}>Face Verified</Text>
                        </View>

                        <View style={styles.toggleContainer}>
                            <TouchableOpacity 
                                style={[styles.toggleBtn, isFaceVerified && styles.toggleActive]}
                                onPress={() => setIsFaceVerified(true)}
                            >
                                <Text>Yes</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.toggleBtn, !isFaceVerified && styles.toggleActive]}
                                onPress={() => setIsFaceVerified(false)}
                            >
                                <Text>No</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* SAVE BUTTON */}
                <TouchableOpacity 
                    style={[styles.saveBtn, loading && styles.disabledBtn]} 
                    onPress={handleSaveChanges}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    resetBtn: { backgroundColor: '#A855F7', padding: 10, borderRadius: 20 },

    container: { flex: 1, backgroundColor: '#FFF' },

    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },

    backBtn: { backgroundColor: '#eee', padding: 10, borderRadius: 20 },

    regNoText: { fontSize: 18, fontWeight: 'bold' },

    scrollContent: { paddingHorizontal: 20 },

    videoPlayer: { height: 200, backgroundColor: '#000', borderRadius: 15, justifyContent: 'center' },

    video: { width: '100%', height: '100%' },

    noVideoText: { color: '#fff', textAlign: 'center' },

    sectionTitle: { fontSize: 20, marginVertical: 20 },

    metricCard: { backgroundColor: '#fff', padding: 15, marginBottom: 10, borderRadius: 10 },

    metricLabel: { fontSize: 10, color: 'gray' },

    metricSubLabel: { fontSize: 14, marginBottom: 5 },

    sliderRow: { flexDirection: 'row', alignItems: 'center' },

    stepBtn: { padding: 10 },

    valuePercentage: { marginLeft: 10 },

    rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },

    toggleContainer: { flexDirection: 'row' },

    toggleBtn: { padding: 10, marginHorizontal: 5, borderRadius: 5 },

    toggleActive: { backgroundColor: '#ddd' },

    saveBtn: { 
        backgroundColor: '#A855F7', 
        padding: 15, 
        borderRadius: 10, 
        marginTop: 20 
    },

    disabledBtn: {
        backgroundColor: '#C4B5FD'
    },

    saveBtnText: { 
        color: '#fff', 
        textAlign: 'center',
        fontWeight: 'bold'
    }
});