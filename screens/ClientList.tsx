import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Modal, Alert, Linking, Platform, KeyboardAvoidingView
} from 'react-native';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppContext } from '../store/AppContext';
import {
  Search, Plus, Phone, Mail, Trash2,
  Edit2, X, Bell, Clock, Briefcase, User, ChevronRight, Filter
} from 'lucide-react-native';
import { Client, ClientReminder } from '../types';

// Konfiguracja powiadomień systemowych
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const ClientList: React.FC = () => {
  const { state, deleteClient, addClient, updateClient, setActiveScreen } = useAppContext();
  const { clients, darkMode } = state;

  // Stany wyszukiwania i filtrowania
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'company' | 'private' | 'tasks'>('all');

  // Stany Modali
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [reminderModal, setReminderModal] = useState<{ isOpen: boolean; client: Client | null }>({ isOpen: false, client: null });

  // Stany formularzy
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [newReminder, setNewReminder] = useState({ date: new Date(), topic: '', note: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    setActiveScreen('Klienci');
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') Alert.alert("Uprawnienia", "Włącz powiadomienia w ustawieniach, aby otrzymywać przypomnienia.");
  };

  // --- LOGIKA WYSZUKIWANIA I FILTROWANIA ---
  const filteredClients = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return clients.filter(c => {
      // 1. Logika Wyszukiwarki (Imię, Nazwisko, Firma)
      const matchesSearch =
        c.firstName.toLowerCase().includes(search) ||
        c.lastName.toLowerCase().includes(search) ||
        (c.companyName?.toLowerCase().includes(search) ?? false);

      if (!matchesSearch) return false;

      // 2. Logika Filtrów
      if (activeFilter === 'company') return !!c.companyName;
      if (activeFilter === 'private') return !c.companyName;
      if (activeFilter === 'tasks') return c.reminders && c.reminders.length > 0;

      return true;
    });
  }, [clients, searchTerm, activeFilter]);

  // --- OBSŁUGA POWIADOMIEŃ (15 MIN PRZED) ---
  const scheduleNotification = async (reminder: ClientReminder, clientName: string) => {
    const [d, m, y] = reminder.date.split('.').map(Number);
    const [hh, mm] = reminder.time.split(':').map(Number);
    const eventDate = new Date(y, m - 1, d, hh, mm);

    const triggerDate = new Date(eventDate.getTime() - 15 * 60000); // -15 minut

    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Zadanie: ${clientName}`,
          body: `Za 15 min: ${reminder.topic}`,
          sound: true,
        },
        trigger: triggerDate,
      });
    }
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({
        firstName: '', lastName: '', phone: '', email: '', companyName: '',
        nip: '', street: '', houseNo: '', apartmentNo: '', postalCode: '',
        city: '', notes: '', reminders: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveClient = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      Alert.alert("Błąd", "Wypełnij wymagane pola (Imię, Nazwisko, Telefon).");
      return;
    }

    const payload = {
      ...formData,
      id: editingClient?.id || `cli_${Date.now()}`,
      createdAt: editingClient?.createdAt || new Date().toISOString(),
      reminders: formData.reminders || []
    } as Client;

    if (editingClient) await updateClient(payload);
    else await addClient(payload);

    setIsModalOpen(false);
  };

  const handleSaveReminder = async () => {
    if (!reminderModal.client || !newReminder.topic) return;

    const reminder: ClientReminder = {
      id: `rem_${Date.now()}`,
      date: newReminder.date.toLocaleDateString('pl-PL'),
      time: newReminder.date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      topic: newReminder.topic,
      note: newReminder.note,
      completed: false,
      notified: false
    };

    const updated = {
      ...reminderModal.client,
      reminders: [...(reminderModal.client.reminders || []), reminder]
    };

    await updateClient(updated);
    await scheduleNotification(reminder, `${updated.firstName} ${updated.lastName}`);

    setReminderModal({ isOpen: false, client: null });
    setNewReminder({ date: new Date(), topic: '', note: '' });
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>

      {/* HEADER: Wyszukiwarka i Filtry */}
      <View style={styles.headerBox}>
        <View style={[styles.searchBar, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
          <Search size={20} color="#64748b" />
          <TextInput
            placeholder="Szukaj (imię, nazwisko, firma)..."
            placeholderTextColor="#64748b"
            style={[styles.searchInput, { color: darkMode ? '#fff' : '#000' }]}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}><X size={18} color="#64748b" /></TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <FilterTab label="Wszyscy" active={activeFilter === 'all'} onPress={() => setActiveFilter('all')} count={clients.length} />
          <FilterTab label="Firmy" active={activeFilter === 'company'} onPress={() => setActiveFilter('company')} icon={<Briefcase size={12} />} />
          <FilterTab label="Prywatni" active={activeFilter === 'private'} onPress={() => setActiveFilter('private')} icon={<User size={12} />} />
          <FilterTab label="Zadania" active={activeFilter === 'tasks'} onPress={() => setActiveFilter('tasks')} icon={<Bell size={12} />} />
        </ScrollView>
      </View>

      {/* LISTA KLIENTÓW */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {filteredClients.map(client => (
          <View key={client.id} style={[styles.card, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{client.firstName[0]}{client.lastName[0]}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.nameText, { color: darkMode ? '#fff' : '#0f172a' }]}>{client.firstName} {client.lastName}</Text>
                <Text style={styles.subText}>{client.companyName || 'Osoba prywatna'}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${client.phone}`)} style={[styles.circleAction, { backgroundColor: '#22c55e' }]}>
                  <Phone size={16} color="#fff" />
                </TouchableOpacity>
                {client.email && (
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${client.email}`)} style={[styles.circleAction, { backgroundColor: '#3b82f6' }]}>
                    <Mail size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Przypomnienia na karcie */}
            {client.reminders && client.reminders.length > 0 && (
              <View style={styles.reminderSection}>
                {client.reminders.slice(0, 2).map(rem => (
                  <View key={rem.id} style={[styles.reminderBar, { backgroundColor: darkMode ? '#1e293b' : '#f1f5f9' }]}>
                    <View style={styles.remHeader}>
                      <Clock size={12} color="#3b82f6" />
                      <Text style={[styles.remTopic, { color: darkMode ? '#fff' : '#1e293b' }]} numberOfLines={1}>{rem.topic}</Text>
                      <Text style={styles.remTime}>{rem.time}</Text>
                    </View>
                    {rem.note ? <Text style={styles.remNote} numberOfLines={1}>{rem.note}</Text> : null}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.cardFooter}>
              <TouchableOpacity onPress={() => setReminderModal({ isOpen: true, client })} style={styles.footerBtn}>
                <Plus size={14} color="#3b82f6" /><Text style={styles.footerBtnText}>ZADANIE</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleOpenModal(client)} style={styles.footerBtn}>
                <Edit2 size={14} color="#64748b" /><Text style={styles.footerBtnText}>EDYTUJ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteClient(client.id)} style={styles.footerBtn}>
                <Trash2 size={14} color="#ef4444" /><Text style={[styles.footerBtnText, {color: '#ef4444'}]}>USUŃ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity onPress={() => handleOpenModal()} style={styles.fab}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      {/* MODAL KLIENTA */}
      <Modal visible={isModalOpen} animationType="slide">
        <View style={[styles.modalContent, { backgroundColor: darkMode ? '#020617' : '#fff' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#0f172a' }]}>{editingClient ? 'Edycja' : 'Nowy Klient'}</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}><X size={24} color={darkMode ? '#fff' : '#000'} /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <KeyboardAvoidingView behavior="padding">
              <Label text="DANE OSOBOWE" />
              <View style={styles.row}>
                <Input label="Imię*" value={formData.firstName} onChangeText={(v:any)=>setFormData({...formData, firstName:v})} darkMode={darkMode} />
                <Input label="Nazwisko*" value={formData.lastName} onChangeText={(v:any)=>setFormData({...formData, lastName:v})} darkMode={darkMode} />
              </View>
              <Input label="Telefon*" value={formData.phone} onChangeText={(v:any)=>setFormData({...formData, phone:v})} darkMode={darkMode} keyboardType="phone-pad" />
              <Input label="Email" value={formData.email} onChangeText={(v:any)=>setFormData({...formData, email:v})} darkMode={darkMode} keyboardType="email-address" />

              <Label text="DANE FIRMY" />
              <Input label="Nazwa firmy" value={formData.companyName} onChangeText={(v:any)=>setFormData({...formData, companyName:v})} darkMode={darkMode} />
              <Input label="NIP" value={formData.nip} onChangeText={(v:any)=>setFormData({...formData, nip:v})} darkMode={darkMode} keyboardType="numeric" />

              <Label text="ADRES" />
              <Input label="Ulica" value={formData.street} onChangeText={(v:any)=>setFormData({...formData, street:v})} darkMode={darkMode} />
              <View style={styles.row}>
                <Input label="Nr domu" value={formData.houseNo} onChangeText={(v:any)=>setFormData({...formData, houseNo:v})} darkMode={darkMode} />
                <Input label="Nr lokalu" value={formData.apartmentNo} onChangeText={(v:any)=>setFormData({...formData, apartmentNo:v})} darkMode={darkMode} />
              </View>
              <View style={styles.row}>
                <Input label="Kod pocztowy" value={formData.postalCode} onChangeText={(v:any)=>setFormData({...formData, postalCode:v})} darkMode={darkMode} />
                <Input label="Miejscowość" value={formData.city} onChangeText={(v:any)=>setFormData({...formData, city:v})} darkMode={darkMode} />
              </View>

              <TouchableOpacity onPress={handleSaveClient} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>ZAPISZ KLIENTA</Text>
              </TouchableOpacity>
              <View style={{ height: 50 }} />
            </KeyboardAvoidingView>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL ZADANIA */}
      <Modal visible={reminderModal.isOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.remCard, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
            <Text style={[styles.remTitle, { color: darkMode ? '#fff' : '#000' }]}>Nowe zadanie</Text>
            <TextInput
              placeholder="Co trzeba zrobić?"
              placeholderTextColor="#64748b"
              style={[styles.remInput, { backgroundColor: darkMode ? '#020617' : '#f8fafc', color: darkMode ? '#fff' : '#000' }]}
              value={newReminder.topic}
              onChangeText={(v) => setNewReminder({...newReminder, topic: v})}
            />
            <TextInput
              placeholder="Notatka (opcjonalnie)..."
              placeholderTextColor="#64748b"
              multiline
              style={[styles.remInput, { backgroundColor: darkMode ? '#020617' : '#f8fafc', color: darkMode ? '#fff' : '#000', height: 80, textAlignVertical: 'top' }]}
              value={newReminder.note}
              onChangeText={(v) => setNewReminder({...newReminder, note: v})}
            />
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
              <Clock size={16} color="#3b82f6" />
              <Text style={styles.dateBtnText}>{newReminder.date.toLocaleString('pl-PL')}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={newReminder.date}
                mode="datetime"
                display="default"
                onChange={(e, d) => { setShowDatePicker(false); if(d) setNewReminder({...newReminder, date: d}); }}
              />
            )}

            <TouchableOpacity onPress={handleSaveReminder} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>ZAPISZ I POWIADOM</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReminderModal({isOpen:false, client:null})} style={{marginTop:15}}><Text style={{color:'#64748b', textAlign:'center'}}>Anuluj</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

// --- Komponenty pomocnicze ---
const FilterTab = ({ label, active, onPress, icon, count }: any) => (
  <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
    {icon && React.cloneElement(icon, { color: active ? '#fff' : '#64748b' })}
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    {count !== undefined && <Text style={[styles.countBadge, active && styles.countBadgeActive]}>{count}</Text>}
  </TouchableOpacity>
);

const Label = ({ text }: { text: string }) => <Text style={styles.formLabel}>{text}</Text>;

const Input = ({ label, value, onChangeText, darkMode, keyboardType }: any) => (
  <View style={{ flex: 1, marginBottom: 15, marginHorizontal: 4 }}>
    <Text style={styles.inputTitle}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      style={[styles.inputField, { backgroundColor: darkMode ? '#0f172a' : '#fff', color: darkMode ? '#fff' : '#000', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBox: { padding: 16, gap: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 16, paddingHorizontal: 15, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600' },
  filterRow: { flexDirection: 'row' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, gap: 6 },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  countBadge: { fontSize: 10, backgroundColor: '#e2e8f0', paddingHorizontal: 6, borderRadius: 10, color: '#64748b' },
  countBadgeActive: { backgroundColor: '#3b82f6', color: '#fff' },
  card: { borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#2563eb20', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#2563eb', fontWeight: '900', fontSize: 16 },
  nameText: { fontSize: 16, fontWeight: '800' },
  subText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  circleAction: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  reminderSection: { marginTop: 12, gap: 6 },
  reminderBar: { padding: 10, borderRadius: 12 },
  remHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remTopic: { flex: 1, fontSize: 12, fontWeight: '700' },
  remTime: { fontSize: 10, fontWeight: '800', color: '#3b82f6' },
  remNote: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f020', paddingTop: 10 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 5 },
  footerBtnText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 20, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  formLabel: { fontSize: 11, fontWeight: '900', color: '#3b82f6', marginTop: 20, marginBottom: 10, letterSpacing: 1 },
  inputTitle: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 5 },
  inputField: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: '#2563eb', height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  remCard: { borderRadius: 28, padding: 25 },
  remTitle: { fontSize: 18, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  remInput: { height: 50, borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, fontWeight: '600' },
  dateBtn: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10, marginBottom: 15 },
  dateBtnText: { fontSize: 14, fontWeight: '700', color: '#3b82f6' },
  row: { flexDirection: 'row' }
});

export default ClientList;