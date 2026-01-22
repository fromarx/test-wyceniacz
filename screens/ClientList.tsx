import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Modal, Alert, Linking, Platform, KeyboardAvoidingView,
  Keyboard, Switch
} from 'react-native';
import * as Notifications from 'expo-notifications';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useAppContext } from '../store/AppContext';
import {
  Search, Plus, Phone, Mail, Trash2,
  Edit2, X, Bell, Clock, Briefcase, User, ChevronRight, Filter
} from 'lucide-react-native';
import { Client, ClientReminder } from '../types';
import { useToast } from '../components/Toast';
import { getThemeColors, getShadows, BorderRadius } from '../utils/theme';

// Konfiguracja powiadomień systemowych
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

const ClientList: React.FC = () => {
  const { state, deleteClient, addClient, updateClient, setActiveScreen } = useAppContext();
  const { clients, darkMode } = state;
  const colors = getThemeColors(darkMode);
  const shadows = getShadows(darkMode);
  const { showToast } = useToast();
  const styles = getStyles(colors);

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
    if (status !== 'granted') showToast("Brak uprawnień do powiadomień", "info");
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
      if (activeFilter === 'company') return c.isCompany === true;
      if (activeFilter === 'private') return c.isCompany !== true;
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
      const seconds = Math.floor((triggerDate.getTime() - new Date().getTime()) / 1000);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Zadanie: ${clientName}`,
          body: `Za 15 min: ${reminder.topic}`,
          sound: 'default',
        },
        trigger: {
          seconds: seconds > 0 ? seconds : 1,
          repeats: false,
        } as any,
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
        city: '', notes: '', reminders: [], isCompany: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveClient = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      showToast("Wypełnij Imię, Nazwisko i Telefon", "error");
      return;
    }

    const payload = {
      ...formData,
      id: editingClient?.id || `cli_${Date.now()}`,
      createdAt: editingClient?.createdAt || new Date().toISOString(),
      reminders: formData.reminders || []
    } as Client;

    try {
      if (editingClient) {
        await updateClient(payload);
        showToast("Zaktualizowano klienta", "success");
      } else {
        await addClient(payload);
        showToast("Dodano nowego klienta", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Błąd zapisu", "error");
    }

    if (Platform.OS !== 'web') Keyboard.dismiss();
    setIsModalOpen(false);
  };

  const showAndroidDateTimePicker = () => {
    // Na Androidzie musimy najpierw wybrać datę, a potem godzinę, jeśli chcemy datetime
    DateTimePickerAndroid.open({
      value: newReminder.date,
      onChange: (event, date) => {
        if (event.type === 'set' && date) {
          // Po wybraniu daty, otwieramy picker godziny
          DateTimePickerAndroid.open({
            value: date,
            onChange: (eventTime, time) => {
              if (eventTime.type === 'set' && time) {
                setNewReminder({ ...newReminder, date: time });
              }
            },
            mode: 'time',
            is24Hour: true,
          });
        }
      },
      mode: 'date',
      display: 'default',
    });
  };

  const handleSaveReminder = async () => {
    if (!reminderModal.client || !newReminder.topic) {
      showToast("Wpisz temat zadania", "error");
      return;
    }

    const reminder: ClientReminder = {
      id: `rem_${Date.now()}`,
      date: newReminder.date.toLocaleDateString('pl-PL'),
      time: newReminder.date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      topic: newReminder.topic,
      note: newReminder.note,
      completed: false,
      notified: false
    };

    // CRITICAL FIX: Ensure we are using the FRESH client object from state, not the stale modal prop
    const currentClient = clients.find(c => c.id === reminderModal.client?.id);

    if (!currentClient) {
      showToast("Nie znaleziono klienta", "error");
      return;
    }

    const updated = {
      ...currentClient,
      reminders: [...(currentClient.reminders || []), reminder]
    };

    try {
      await updateClient(updated);
      await scheduleNotification(reminder, `${updated.firstName} ${updated.lastName}`);
      showToast("Zadanie dodane", "success");
    } catch (e) {
      console.error(e);
      showToast("Błąd dodawania zadania", "error");
    }

    if (Platform.OS !== 'web') Keyboard.dismiss();
    setReminderModal({ isOpen: false, client: null });
    setNewReminder({ date: new Date(), topic: '', note: '' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* HEADER: Wyszukiwarka i Filtry */}
      <View style={styles.headerBox}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            placeholder="Szukaj (imię, nazwisko, firma)..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}><X size={18} color={colors.textMuted} /></TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <FilterTab label="Wszyscy" active={activeFilter === 'all'} onPress={() => setActiveFilter('all')} count={clients.length} colors={colors} styles={styles} />
          <FilterTab label="Firmy" active={activeFilter === 'company'} onPress={() => setActiveFilter('company')} icon={<Briefcase size={12} />} colors={colors} styles={styles} />
          <FilterTab label="Prywatni" active={activeFilter === 'private'} onPress={() => setActiveFilter('private')} icon={<User size={12} />} colors={colors} styles={styles} />
          <FilterTab label="Zadania" active={activeFilter === 'tasks'} onPress={() => setActiveFilter('tasks')} icon={<Bell size={12} />} colors={colors} styles={styles} />
        </ScrollView>
      </View>

      {/* LISTA KLIENTÓW */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {filteredClients.map(client => (
          <View key={client.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
            <View style={styles.cardTop}>
              <View style={[styles.avatar, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.avatarText, { color: colors.accent }]}>{client.firstName[0]}{client.lastName[0]}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.nameText, { color: colors.text }]}>{client.firstName} {client.lastName}</Text>
                  {client.isCompany && (
                    <View style={[styles.firmaBadge, { backgroundColor: colors.accent }]}>
                      <Briefcase size={10} color="#fff" />
                      <Text style={styles.firmaBadgeText}>FIRMA</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.subText, { color: colors.textSecondary }]}>{client.companyName || (client.isCompany ? 'Firma' : 'Osoba prywatna')}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${client.phone}`)} style={[styles.circleAction, { backgroundColor: colors.success }]}>
                  <Phone size={16} color="#fff" />
                </TouchableOpacity>
                {client.email && (
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${client.email}`)} style={[styles.circleAction, { backgroundColor: colors.accent }]}>
                    <Mail size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Przypomnienia na karcie */}
            {client.reminders && client.reminders.length > 0 && (
              <View style={styles.reminderSection}>
                {client.reminders.slice(0, 2).map(rem => (
                  <View key={rem.id} style={[styles.reminderBar, { backgroundColor: colors.surfaceSubtle }]}>
                    <View style={styles.remHeader}>
                      <Clock size={12} color={colors.accent} />
                      <Text style={[styles.remTopic, { color: colors.text }]} numberOfLines={1}>{rem.topic}</Text>
                      <Text style={[styles.remTime, { color: colors.accent }]}>{rem.time}</Text>
                    </View>
                    {rem.note ? <Text style={[styles.remNote, { color: colors.textMuted }]} numberOfLines={1}>{rem.note}</Text> : null}
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity onPress={() => setReminderModal({ isOpen: true, client })} style={styles.footerBtn}>
                <Plus size={14} color={colors.accent} /><Text style={[styles.footerBtnText, { color: colors.accent }]}>ZADANIE</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleOpenModal(client)} style={styles.footerBtn}>
                <Edit2 size={14} color={colors.textSecondary} /><Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>EDYTUJ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                Alert.alert("Usuń klienta", "Czy na pewno?", [
                  { text: "Anuluj", style: "cancel" },
                  {
                    text: "Usuń", style: "destructive", onPress: () => {
                      deleteClient(client.id);
                      showToast("Klient usunięty", "info");
                    }
                  }
                ])
              }} style={styles.footerBtn}>
                <Trash2 size={14} color={colors.danger} /><Text style={[styles.footerBtnText, { color: colors.danger }]}>USUŃ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity onPress={() => handleOpenModal()} style={[styles.fab, { backgroundColor: colors.accent }]}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      {/* MODAL KLIENTA */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        onRequestClose={() => {
          if (Platform.OS !== 'web' && Keyboard && Keyboard.dismiss) Keyboard.dismiss();
          setIsModalOpen(false);
        }}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingClient ? 'Edycja' : 'Nowy Klient'}</Text>
            <TouchableOpacity onPress={() => { if (Platform.OS !== 'web' && Keyboard && Keyboard.dismiss) Keyboard.dismiss(); setIsModalOpen(false); }}><X size={24} color={colors.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <KeyboardAvoidingView behavior="padding">
              <Label text="DANE OSOBOWE" colors={colors} styles={styles} />
              <View style={styles.row}>
                <Input label="Imię*" value={formData.firstName} onChangeText={(v: any) => setFormData({ ...formData, firstName: v })} colors={colors} styles={styles} />
                <Input label="Nazwisko*" value={formData.lastName} onChangeText={(v: any) => setFormData({ ...formData, lastName: v })} colors={colors} styles={styles} />
              </View>
              <Input label="Telefon*" value={formData.phone} onChangeText={(v: any) => setFormData({ ...formData, phone: v })} colors={colors} styles={styles} keyboardType="phone-pad" />
              <Input label="Email" value={formData.email} onChangeText={(v: any) => setFormData({ ...formData, email: v })} colors={colors} styles={styles} keyboardType="email-address" />

              <Label text="DANE FIRMY" colors={colors} styles={styles} />
              <View style={[styles.switchRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Klient firmowy</Text>
                  <Text style={[styles.switchHint, { color: colors.textMuted }]}>Włącz jeśli wystawiasz na firmę</Text>
                </View>
                <Switch
                  value={formData.isCompany || false}
                  onValueChange={(v) => setFormData({ ...formData, isCompany: v })}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={formData.isCompany ? '#fff' : colors.textMuted}
                />
              </View>
              <Input label="Nazwa firmy" value={formData.companyName} onChangeText={(v: any) => setFormData({ ...formData, companyName: v })} colors={colors} styles={styles} />
              <Input label="NIP" value={formData.nip} onChangeText={(v: any) => setFormData({ ...formData, nip: v })} colors={colors} styles={styles} keyboardType="numeric" />

              <Label text="ADRES" colors={colors} styles={styles} />
              <Input label="Ulica" value={formData.street} onChangeText={(v: any) => setFormData({ ...formData, street: v })} colors={colors} styles={styles} />
              <View style={styles.row}>
                <Input label="Nr domu" value={formData.houseNo} onChangeText={(v: any) => setFormData({ ...formData, houseNo: v })} colors={colors} styles={styles} />
                <Input label="Nr lokalu" value={formData.apartmentNo} onChangeText={(v: any) => setFormData({ ...formData, apartmentNo: v })} colors={colors} styles={styles} />
              </View>
              <View style={styles.row}>
                <Input label="Kod pocztowy" value={formData.postalCode} onChangeText={(v: any) => setFormData({ ...formData, postalCode: v })} colors={colors} styles={styles} />
                <Input label="Miejscowość" value={formData.city} onChangeText={(v: any) => setFormData({ ...formData, city: v })} colors={colors} styles={styles} />
              </View>

              <TouchableOpacity onPress={handleSaveClient} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.saveBtnText}>ZAPISZ KLIENTA</Text>
              </TouchableOpacity>
              <View style={{ height: 50 }} />
            </KeyboardAvoidingView>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL ZADANIA */}
      <Modal
        visible={reminderModal.isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (Platform.OS !== 'web' && Keyboard && Keyboard.dismiss) Keyboard.dismiss();
          setReminderModal({ ...reminderModal, isOpen: false });
        }}
      >
        <View style={styles.overlay}>
          <View style={[styles.remCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.remTitle, { color: colors.text }]}>Nowe zadanie</Text>
            <TextInput
              placeholder="Co trzeba zrobić?"
              placeholderTextColor={colors.textMuted}
              style={[styles.remInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
              value={newReminder.topic}
              onChangeText={(v) => setNewReminder({ ...newReminder, topic: v })}
            />
            <TextInput
              placeholder="Notatka (opcjonalnie)..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.remInput, { backgroundColor: colors.background, color: colors.text, height: 80, textAlignVertical: 'top', borderColor: colors.border, borderWidth: 1 }]}
              value={newReminder.note}
              onChangeText={(v) => setNewReminder({ ...newReminder, note: v })}
            />
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'android') {
                  showAndroidDateTimePicker();
                } else {
                  setShowDatePicker(true);
                }
              }}
              style={[styles.dateBtn, { borderColor: colors.border }]}
            >
              <Clock size={16} color={colors.accent} />
              <Text style={[styles.dateBtnText, { color: colors.accent }]}>{newReminder.date.toLocaleString('pl-PL')}</Text>
            </TouchableOpacity>

            {showDatePicker && Platform.OS === 'ios' && (
              <DateTimePicker
                value={newReminder.date}
                mode="datetime"
                display="default"
                onChange={(e, d) => {
                  if (d) setNewReminder({ ...newReminder, date: d });
                }}
              />
            )}

            <TouchableOpacity onPress={handleSaveReminder} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
              <Text style={styles.saveBtnText}>ZAPISZ I POWIADOM</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReminderModal({ isOpen: false, client: null })} style={{ marginTop: 15 }}><Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Anuluj</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

// --- Komponenty pomocnicze ---
const FilterTab = ({ label, active, onPress, icon, count, colors, styles }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.tab,
      active ? { backgroundColor: colors.accent } : { backgroundColor: colors.surfaceSubtle }
    ]}
  >
    {icon && React.cloneElement(icon, { color: active ? '#fff' : colors.textSecondary })}
    <Text style={[styles.tabText, { color: active ? '#fff' : colors.textSecondary }]}>{label}</Text>
    {count !== undefined && (
      <Text style={[
        styles.countBadge,
        active ? { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' } : { backgroundColor: colors.border, color: colors.textSecondary }
      ]}>
        {count}
      </Text>
    )}
  </TouchableOpacity>
);

const Label = ({ text, colors, styles }: { text: string, colors: any, styles: any }) => <Text style={[styles.formLabel, { color: colors.accent }]}>{text}</Text>;

const Input = ({ label, value, onChangeText, colors, styles, keyboardType }: any) => (
  <View style={{ flex: 1, marginBottom: 15, marginHorizontal: 4 }}>
    <Text style={[styles.inputTitle, { color: colors.textSecondary }]}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      style={[styles.inputField, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
    />
  </View>
);

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  headerBox: { padding: 16, gap: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 16, paddingHorizontal: 15, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600' },
  filterRow: { flexDirection: 'row' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, gap: 6 },
  tabText: { fontSize: 12, fontWeight: '700' },
  countBadge: { fontSize: 10, paddingHorizontal: 6, borderRadius: 10 },
  card: { borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '900', fontSize: 16 },
  nameText: { fontSize: 16, fontWeight: '800' },
  subText: { fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  circleAction: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  reminderSection: { marginTop: 12, gap: 6 },
  reminderBar: { padding: 10, borderRadius: 12 },
  remHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remTopic: { flex: 1, fontSize: 12, fontWeight: '700' },
  remTime: { fontSize: 10, fontWeight: '800' },
  remNote: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, paddingTop: 10 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 5 },
  footerBtnText: { fontSize: 11, fontWeight: '800' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 10 },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  formLabel: { fontSize: 11, fontWeight: '900', marginTop: 20, marginBottom: 10, letterSpacing: 1 },
  inputTitle: { fontSize: 10, fontWeight: '700', marginBottom: 5 },
  inputField: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 14, fontWeight: '600' },
  saveBtn: { height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  remCard: { borderRadius: 28, padding: 25 },
  remTitle: { fontSize: 18, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  remInput: { height: 50, borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, fontWeight: '600' },
  dateBtn: { height: 50, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10, marginBottom: 15 },
  dateBtnText: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row' },
  firmaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  firmaBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  switchRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 15, borderWidth: 1 },
  switchLabel: { fontSize: 14, fontWeight: '700' },
  switchHint: { fontSize: 11, marginTop: 2 }
});

export default ClientList;