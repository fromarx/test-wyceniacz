import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Image, 
  Alert, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAppContext } from '../store/AppContext';
import { 
  Save, Building2, User as UserIcon, MapPin, Hash, Mail,
  ChevronLeft, 
  CheckCircle2, AlertCircle, Edit3, X, Zap, Trash2, 
  Phone, Moon, Sun, BellRing, Settings, Upload, 
  Database, Download, Palette, FileText 
} from 'lucide-react-native';

import { User, SubscriptionStatus } from '../types';

interface ProfileProps {
  forced?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ forced = false }) => {
  const { state, updateUser, setActiveScreen, toggleDarkMode, requestNotificationPermission, exportAllData } = useAppContext();
  const { user, darkMode, subscriptionStatus } = state;
  const navigation = useNavigation();

  const [isEditing, setIsEditing] = useState(forced);
  const [isExporting, setIsExporting] = useState(false);
  const [formData, setFormData] = useState<User>(user || {
    id: '1', email: '', firstName: '', lastName: '', companyName: '', nip: '', phone: '', address: '', city: '', postalCode: '', pdfThemeColor: '#2563eb'
  });

  useEffect(() => {
    if (user) setFormData(user);
  }, [user]);

  const pdfThemes = [
    { color: '#2563eb', name: 'Klasyczny Niebieski' },
    { color: '#374151', name: 'Elegancki Grafit' },
    { color: '#059669', name: 'Nowoczesna Zieleń' },
  ];

  const handleSave = () => {
    const requiredFields: (keyof User)[] = ['firstName', 'lastName', 'companyName', 'address', 'city', 'postalCode'];
    const missing = requiredFields.filter(f => !formData[f]);
    
    if (missing.length > 0) {
      Alert.alert("Błąd", "Proszę uzupełnić dane właściciela oraz firmy (pola wymagane).");
      return;
    }
    
    updateUser(formData);
    setIsEditing(false);
    
    if (forced) {
       // @ts-ignore
      navigation.replace('MainTabs'); 
    } else {
      Alert.alert("Sukces", "Profil został zaktualizowany.");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const fileName = `Wyceniarz_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    } catch (err) {
      Alert.alert("Błąd", "Nie udało się wyeksportować danych.");
    } finally {
      setIsExporting(false);
    }
  };

useEffect(() => {
  setActiveScreen('Profil');
}, []);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setFormData(prev => ({ ...prev, logo: base64Image }));
    }
  };

  const removeLogo = () => {
    Alert.alert("Usuń logo", "Czy na pewno chcesz usunąć logo firmowe?", [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => setFormData(prev => ({ ...prev, logo: '' })) }
    ]);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* --- TUTAJ WSTAW NOWY KOD --- */}
      {!forced && (
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            padding: 16, 
            marginBottom: 8,
            backgroundColor: darkMode ? '#0f172a' : '#fff',
            borderBottomWidth: 1,
            borderBottomColor: darkMode ? '#1e293b' : '#e2e8f0'
          }}
        >
          <ChevronLeft size={24} color={darkMode ? '#fff' : '#0f172a'} />
          <Text style={{ 
            color: darkMode ? '#fff' : '#0f172a', 
            fontWeight: 'bold', 
            marginLeft: 8,
            fontSize: 14
          }}>
            POWRÓT DO DASHBOARDU
          </Text>
        </TouchableOpacity>
      )}
      {/* --- KONIEC WSTAWIANIA --- */}

      {forced && (
        <View style={styles.forcedAlert}>
          <AlertCircle color="#fff" size={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertSmall}>WYMAGANA KONFIGURACJA</Text>
            <Text style={styles.alertMain}>Uzupełnij profil, aby móc generować PDFy.</Text>
          </View>
        </View>
      )}

      {/* Profil Header */}
      <View style={[styles.profileCard, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
        <View style={styles.badge}>
          <Zap size={10} color="#3b82f6" fill="#3b82f6" />
          <Text style={styles.badgeText}>{subscriptionStatus === SubscriptionStatus.ACTIVE ? 'PREMIUM' : 'STANDARD'}</Text>
        </View>
        
        <View style={[styles.logoCircle, { backgroundColor: darkMode ? '#1e293b' : '#fff', borderColor: darkMode ? '#334155' : '#f1f5f9' }]}>
          {formData.logo ? (
            <Image source={{ uri: formData.logo }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <Text style={styles.logoPlaceholder}>{formData.companyName?.[0] || 'Q'}</Text>
          )}
        </View>
        
        <Text style={[styles.userName, { color: darkMode ? '#f1f5f9' : '#0f172a' }]}>{formData.firstName} {formData.lastName}</Text>
        <Text style={styles.userCompany}>{formData.companyName || 'Nowa Firma'}</Text>
      </View>

      <View style={styles.formSection}>
        {/* Sekcja: Dane */}
        <SectionTitle icon={<UserIcon size={16} color="#2563eb" />} title="Dane Właściciela" darkMode={darkMode} />
        <View style={[styles.inputGroup, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
          <View style={styles.row}>
            <InputField label="Imię" value={formData.firstName} onChangeText={(v: string) => setFormData({...formData, firstName: v})} editable={isEditing} darkMode={darkMode} />
            <InputField label="Nazwisko" value={formData.lastName} onChangeText={(v: string) => setFormData({...formData, lastName: v})} editable={isEditing} darkMode={darkMode} />
          </View>
          <InputField label="E-mail" value={formData.email} onChangeText={(v: string) => setFormData({...formData, email: v})} editable={isEditing} darkMode={darkMode} icon={<Mail size={14} color="#64748b" />} />
        </View>

        {/* Sekcja: Logo i Firma */}
        <SectionTitle icon={<Building2 size={16} color="#2563eb" />} title="Firma i Logo" darkMode={darkMode} />
        <View style={[styles.inputGroup, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
          <View style={[styles.logoPicker, { backgroundColor: darkMode ? '#020617' : '#f8fafc', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
            <View style={styles.logoPreviewBox}>
              {formData.logo ? (
                <Image source={{ uri: formData.logo }} style={styles.logoImageSmall} />
              ) : (
                <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 20, opacity: 0.2 }}>Q</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              {isEditing ? (
                <View style={styles.row}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={pickLogo}>
                    <Upload size={14} color="#2563eb" />
                    <Text style={styles.uploadBtnText}>WGRAJ</Text>
                  </TouchableOpacity>
                  {formData.logo && (
                    <TouchableOpacity style={styles.deleteLogoBtn} onPress={removeLogo}>
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.logoInfo}>Logo pojawi się na PDF.</Text>
              )}
            </View>
          </View>
          
          <InputField label="Nazwa firmy" value={formData.companyName} onChangeText={(v: string) => setFormData({...formData, companyName: v})} editable={isEditing} darkMode={darkMode} />
          <InputField label="Ulica" value={formData.address} onChangeText={(v: string) => setFormData({...formData, address: v})} editable={isEditing} darkMode={darkMode} />
          <View style={styles.row}>
            <InputField label="Kod" value={formData.postalCode} onChangeText={(v: string) => setFormData({...formData, postalCode: v})} editable={isEditing} darkMode={darkMode} />
            <InputField label="Miejscowość" value={formData.city} onChangeText={(v: string) => setFormData({...formData, city: v})} editable={isEditing} darkMode={darkMode} />
          </View>
        </View>

        {/* Motyw PDF */}
        <SectionTitle icon={<Palette size={16} color="#2563eb" />} title="Wygląd PDF" darkMode={darkMode} />
        <View style={[styles.inputGroup, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
          <View style={styles.row}>
            {pdfThemes.map(theme => (
              <TouchableOpacity 
                key={theme.color}
                disabled={!isEditing}
                onPress={() => setFormData({...formData, pdfThemeColor: theme.color})}
                style={[styles.themeBtn, { backgroundColor: theme.color, borderWidth: 4, borderColor: formData.pdfThemeColor === theme.color ? '#3b82f6' : 'transparent' }]}
              />
            ))}
          </View>
        </View>

        {/* Eksport Danych */}
        <SectionTitle icon={<Database size={16} color="#2563eb" />} title="Baza danych" darkMode={darkMode} />
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: darkMode ? '#1e293b' : '#f1f5f9' }]} onPress={handleExport}>
          {isExporting ? <ActivityIndicator size="small" color="#2563eb" /> : <Download size={18} color="#2563eb" />}
          <Text style={[styles.exportBtnText, { color: darkMode ? '#fff' : '#0f172a' }]}>EKSPORTUJ KOPIĘ (JSON)</Text>
        </TouchableOpacity>

        {/* Przyciski Akcji */}
        <View style={styles.actions}>
          {isEditing ? (
            <View style={styles.row}>
              {!forced && (
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => { setIsEditing(false); setFormData(user!); }}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSave}>
                <CheckCircle2 size={20} color="#fff" />
                <Text style={styles.saveBtnText}>ZAPISZ ZMIANY</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, styles.editBtnFull]} onPress={() => setIsEditing(true)}>
              <Edit3 size={20} color={darkMode ? '#fff' : '#0f172a'} />
              <Text style={[styles.editBtnText, { color: darkMode ? '#fff' : '#0f172a' }]}>EDYTUJ PROFIL</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

// --- Komponenty pomocnicze ---

const SectionTitle = ({ icon, title, darkMode }: any) => (
  <View style={styles.sectionHeader}>
    {icon}
    <Text style={[styles.sectionHeaderText, { color: darkMode ? '#475569' : '#1e293b' }]}>{title}</Text>
  </View>
);

const InputField = ({ label, value, onChangeText, editable, icon, darkMode }: any) => (
  <View style={styles.inputField}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputContainer, { backgroundColor: darkMode ? '#020617' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
      {icon && <View style={styles.inputIcon}>{icon}</View>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        style={[styles.input, { color: darkMode ? '#f1f5f9' : '#0f172a', opacity: editable ? 1 : 0.5 }]}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  forcedAlert: { backgroundColor: '#2563eb', margin: 16, padding: 16, borderRadius: 20, flexDirection: 'row', gap: 12, alignItems: 'center' },
  alertSmall: { color: '#fff', fontSize: 10, fontWeight: '900', opacity: 0.8 },
  alertMain: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  profileCard: { margin: 16, padding: 24, borderRadius: 32, borderWidth: 1, alignItems: 'center' },
  badge: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f615', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 8, fontWeight: '900', color: '#3b82f6', marginLeft: 4 },
  logoCircle: { w: 110, h: 110, width: 110, height: 110, borderRadius: 24, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden', elevation: 10 },
  logoImage: { width: '100%', height: '100%' },
  logoPlaceholder: { fontSize: 32, fontWeight: '900', color: '#3b82f6' },
  userName: { fontSize: 20, fontWeight: '900' },
  userCompany: { fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },
  formSection: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 16, paddingLeft: 8 },
  sectionHeaderText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  inputGroup: { borderRadius: 24, padding: 20, borderWidth: 1, gap: 16 },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  inputField: { flex: 1, gap: 6 },
  inputLabel: { fontSize: 8, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', paddingLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 48 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, fontWeight: 'bold' },
  logoPicker: { padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoPreviewBox: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoImageSmall: { width: '100%', height: '100%' },
  logoInfo: { fontSize: 10, color: '#64748b', fontStyle: 'italic' },
  uploadBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  uploadBtnText: { fontSize: 10, fontWeight: '900', color: '#2563eb' },
  deleteLogoBtn: { padding: 8 },
  themeBtn: { width: 44, height: 44, borderRadius: 12 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 12, marginTop: 8 },
  exportBtnText: { fontSize: 10, fontWeight: '900' },
  actions: { marginTop: 32 },
  actionBtn: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#e2e8f0' },
  saveBtn: { flex: 3, backgroundColor: '#2563eb', borderBottomWidth: 4, borderBottomColor: '#1e40af' },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  editBtnFull: { width: '100%', borderWidth: 2, borderColor: '#e2e8f0' },
  editBtnText: { fontWeight: '900', fontSize: 12 }
});

export default Profile;