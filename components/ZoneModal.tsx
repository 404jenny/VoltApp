import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, TextInput, Alert
} from 'react-native';
import { allZones, getZone, categories } from '../lib/zones';
import { loadUserZones, saveUserZones } from '../lib/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_ZONES_KEY = 'custom_zones';

const PRESET_COLORS = [
  '#4f52ff', '#7af0c4', '#f5a623', '#f07ab8', '#7ab8f0',
  '#c47af0', '#f0d87a', '#f07a7a', '#7af0a0', '#f0a87a',
];

type CustomZone = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  desc: string;
  category: string;
  isCustom: true;
};

type EditingZone = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  desc: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ZoneModal({ visible, onClose }: Props) {
  const [myZones, setMyZones] = useState<string[]>([]);
  const [customZones, setCustomZones] = useState<CustomZone[]>([]);
  const [view, setView] = useState<'manage' | 'library' | 'create' | 'edit'>('manage');
  const [editing, setEditing] = useState<EditingZone | null>(null);

  // Create/edit form state
  const [formName, setFormName] = useState('');
  const [formEmoji, setFormEmoji] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formDesc, setFormDesc] = useState('');

  useEffect(() => {
    if (visible) {
      loadUserZones().then(z =>
        setMyZones(z.length > 0 ? z : ['deep-focus', 'builder', 'wind-down', 'movement', 'stillness'])
      );
      loadCustomZones();
    }
  }, [visible]);

  async function loadCustomZones() {
    try {
      const raw = await AsyncStorage.getItem(CUSTOM_ZONES_KEY);
      if (raw) setCustomZones(JSON.parse(raw));
    } catch {}
  }

  async function saveCustomZones(zones: CustomZone[]) {
    setCustomZones(zones);
    await AsyncStorage.setItem(CUSTOM_ZONES_KEY, JSON.stringify(zones));
  }

  function getZoneData(id: string) {
    const custom = customZones.find(z => z.id === id);
    if (custom) return custom;
    return getZone(id);
  }

  // ── MY ZONES MANAGEMENT ──
  async function removeZone(id: string) {
    if (myZones.length <= 1) return;
    const updated = myZones.filter(z => z !== id);
    setMyZones(updated);
    await saveUserZones(updated);
  }

  async function addZone(id: string) {
    if (myZones.includes(id) || myZones.length >= 8) return;
    const updated = [...myZones, id];
    setMyZones(updated);
    await saveUserZones(updated);
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    const updated = [...myZones];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setMyZones(updated);
    await saveUserZones(updated);
  }

  async function moveDown(index: number) {
    if (index === myZones.length - 1) return;
    const updated = [...myZones];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setMyZones(updated);
    await saveUserZones(updated);
  }

  // ── CREATE ZONE ──
  function openCreate() {
    setFormName('');
    setFormEmoji('');
    setFormColor(PRESET_COLORS[0]);
    setFormDesc('');
    setEditing(null);
    setView('create');
  }

  async function handleCreate() {
    if (!formName.trim() || !formEmoji.trim()) return;
    const id = `custom-${Date.now()}`;
    const newZone: CustomZone = {
      id,
      name: formName.trim(),
      emoji: formEmoji.trim(),
      color: formColor,
      desc: formDesc.trim(),
      category: 'Custom',
      isCustom: true,
    };
    const updated = [...customZones, newZone];
    await saveCustomZones(updated);
    await addZone(id);
    setView('manage');
  }

  // ── EDIT ZONE ──
  function openEdit(id: string) {
    const z = getZoneData(id);
    setEditing({ id, name: z.name, emoji: z.emoji, color: z.color, desc: z.desc || '' });
    setFormName(z.name);
    setFormEmoji(z.emoji);
    setFormColor(z.color);
    setFormDesc(z.desc || '');
    setView('edit');
  }

  async function handleEdit() {
    if (!editing || !formName.trim() || !formEmoji.trim()) return;
    const isCustom = customZones.some(z => z.id === editing.id);
    if (isCustom) {
      const updated = customZones.map(z =>
        z.id === editing.id
          ? { ...z, name: formName.trim(), emoji: formEmoji.trim(), color: formColor, desc: formDesc.trim() }
          : z
      );
      await saveCustomZones(updated);
    }
    setView('manage');
  }

  async function handleDeleteCustomZone(id: string) {
    Alert.alert('Delete Zone', 'Remove this custom zone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = customZones.filter(z => z.id !== id);
          await saveCustomZones(updated);
          await removeZone(id);
          setView('manage');
        }
      }
    ]);
  }

  // ── FORM VIEW (create or edit) ──
  const isFormView = view === 'create' || view === 'edit';

  if (isFormView) {
    const isEdit = view === 'edit';
    const isBuiltIn = isEdit && editing && !customZones.some(z => z.id === editing.id);

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setView('manage')}>
              <Text style={styles.backBtn}>← BACK</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{isEdit ? 'EDIT ZONE' : 'NEW ZONE'}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {isBuiltIn && (
              <View style={styles.builtInBanner}>
                <Text style={styles.builtInText}>
                  ⚡ This is a built-in zone. Changes apply to your view only.
                </Text>
              </View>
            )}

            {/* Preview */}
            <View style={[styles.previewCard, { borderColor: formColor }]}>
              <Text style={styles.previewEmoji}>{formEmoji || '?'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewName, { color: formColor }]}>
                  {formName.toUpperCase() || 'ZONE NAME'}
                </Text>
                <Text style={styles.previewDesc} numberOfLines={2}>
                  {formDesc || 'Your zone description...'}
                </Text>
              </View>
            </View>

            {/* Emoji */}
            <Text style={styles.fieldLabel}>EMOJI</Text>
            <TextInput
              style={styles.emojiInput}
              value={formEmoji}
              onChangeText={setFormEmoji}
              placeholder="Paste an emoji"
              placeholderTextColor="#5050a0"
              maxLength={4}
            />

            {/* Name */}
            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput
              style={styles.input}
              value={formName}
              onChangeText={setFormName}
              placeholder="Zone name"
              placeholderTextColor="#5050a0"
              maxLength={30}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formDesc}
              onChangeText={setFormDesc}
              placeholder="What is this zone for?"
              placeholderTextColor="#5050a0"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={120}
            />

            {/* Color */}
            <Text style={styles.fieldLabel}>COLOR</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, formColor === c && styles.colorDotActive]}
                  onPress={() => setFormColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: formColor }, (!formName.trim() || !formEmoji.trim()) && styles.saveBtnDisabled]}
              onPress={isEdit ? handleEdit : handleCreate}
              disabled={!formName.trim() || !formEmoji.trim()}>
              <Text style={styles.saveBtnText}>
                {isEdit ? 'SAVE CHANGES' : 'CREATE ZONE ⚡'}
              </Text>
            </TouchableOpacity>

            {isEdit && editing && customZones.some(z => z.id === editing.id) && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteCustomZone(editing.id)}>
                <Text style={styles.deleteBtnText}>Delete this zone</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ── LIBRARY VIEW ──
  if (view === 'library') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setView('manage')}>
              <Text style={styles.backBtn}>← BACK</Text>
            </TouchableOpacity>
            <Text style={styles.title}>ZONE LIBRARY</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.sectionHint}>
              Tap to add or remove zones from your list.
            </Text>

            {/* Custom zones first */}
            {customZones.length > 0 && (
              <View>
                <Text style={styles.categoryLabel}>MY CUSTOM ZONES</Text>
                {customZones.map(z => {
                  const isAdded = myZones.includes(z.id);
                  return (
                    <TouchableOpacity
                      key={z.id}
                      style={[styles.libraryRow, isAdded && styles.libraryRowAdded]}
                      onPress={() => isAdded ? removeZone(z.id) : addZone(z.id)}>
                      <Text style={styles.zoneEmoji}>{z.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.zoneName, { color: isAdded ? z.color : '#5050a0' }]}>
                          {z.name.toUpperCase()}
                        </Text>
                        <Text style={styles.zoneDesc}>{z.desc}</Text>
                      </View>
                      <Text style={[styles.addTag, isAdded && { color: '#f07a7a' }]}>
                        {isAdded ? '✕ remove' : myZones.length >= 8 ? 'full' : '+ add'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Built-in zones by category */}
            {categories.map(cat => (
              <View key={cat}>
                <Text style={styles.categoryLabel}>{cat.toUpperCase()}</Text>
                {allZones.filter(z => z.category === cat).map(z => {
                  const isAdded = myZones.includes(z.id);
                  const isFull = myZones.length >= 8;
                  return (
                    <TouchableOpacity
                      key={z.id}
                      style={[styles.libraryRow, isAdded && styles.libraryRowAdded]}
                      onPress={() => isAdded ? removeZone(z.id) : addZone(z.id)}
                      disabled={!isAdded && isFull}>
                      <Text style={styles.zoneEmoji}>{z.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.zoneName, { color: isAdded ? z.color : '#5050a0' }]}>
                          {z.name.toUpperCase()}
                        </Text>
                        <Text style={styles.zoneDesc}>{z.desc}</Text>
                      </View>
                      <Text style={[styles.addTag, isAdded && { color: '#f07a7a' }]}>
                        {isAdded ? '✕ remove' : isFull ? 'full' : '+ add'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ── MANAGE VIEW (default) ──
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>MY ZONES</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.doneBtn}>DONE</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionHint}>
            Reorder, edit, or remove your zones. Up to 8 zones.
          </Text>

          {myZones.map((id, index) => {
            const z = getZoneData(id);
            return (
              <View key={id} style={[styles.zoneRow, { borderColor: z.color + '40' }]}>
                <Text style={styles.zoneEmoji}>{z.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.zoneName, { color: z.color }]}>
                    {z.name.toUpperCase()}
                  </Text>
                  {z.desc ? <Text style={styles.zoneDesc} numberOfLines={1}>{z.desc}</Text> : null}
                </View>
                <View style={styles.zoneActions}>
                  <TouchableOpacity onPress={() => openEdit(id)} style={styles.actionBtn}>
                    <Text style={styles.editBtnText}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveUp(index)} style={styles.actionBtn}>
                    <Text style={styles.arrowText}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveDown(index)} style={styles.actionBtn}>
                    <Text style={styles.arrowText}>↓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeZone(id)} style={styles.actionBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {myZones.length < 8 && (
            <View style={styles.addSlot}>
              <Text style={styles.addSlotText}>
                + {8 - myZones.length} slot{8 - myZones.length > 1 ? 's' : ''} available
              </Text>
            </View>
          )}

          {/* Actions */}
          <TouchableOpacity style={styles.libraryBtn} onPress={() => setView('library')}>
            <Text style={styles.libraryBtnText}>▼ BROWSE ZONE LIBRARY</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
            <Text style={styles.createBtnText}>⚡ CREATE CUSTOM ZONE</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#2a2a5a',
  },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: 4, color: '#e8e8ff' },
  doneBtn: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: '#4f52ff' },
  backBtn: { fontSize: 11, letterSpacing: 2, color: '#4f52ff', fontWeight: '700' },
  content: { padding: 24, paddingBottom: 60 },
  sectionHint: { fontSize: 11, color: '#5050a0', marginBottom: 16, lineHeight: 18 },
  categoryLabel: {
    fontSize: 8, letterSpacing: 2, color: '#2a2a5a',
    textTransform: 'uppercase', marginTop: 20, marginBottom: 8,
  },

  // Zone rows
  zoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#13132e', borderWidth: 1, borderRadius: 10,
    padding: 14, marginBottom: 8,
  },
  zoneEmoji: { fontSize: 20 },
  zoneName: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  zoneDesc: { fontSize: 10, color: '#2a2a5a', marginTop: 2 },
  zoneActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionBtn: { padding: 7 },
  arrowText: { fontSize: 14, color: '#5050a0' },
  editBtnText: { fontSize: 14, color: '#4f52ff' },
  removeBtnText: { fontSize: 14, color: '#5050a0' },

  addSlot: {
    borderWidth: 1, borderColor: '#2a2a5a', borderStyle: 'dashed',
    borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 4,
  },
  addSlotText: { fontSize: 11, color: '#2a2a5a', letterSpacing: 0.5 },

  libraryBtn: {
    borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 16,
  },
  libraryBtnText: { fontSize: 11, color: '#5050a0', letterSpacing: 2, fontWeight: '700' },

  createBtn: {
    backgroundColor: '#4f52ff', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 10,
  },
  createBtnText: { fontSize: 13, color: '#fff', fontWeight: '700', letterSpacing: 2 },

  // Library
  libraryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 4,
  },
  libraryRowAdded: { backgroundColor: '#13132e' },
  addTag: { fontSize: 10, color: '#7af0c4', fontWeight: '700', letterSpacing: 0.5 },

  // Form
  builtInBanner: {
    backgroundColor: 'rgba(245,166,35,0.08)', borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)', borderRadius: 10,
    padding: 12, marginBottom: 20,
  },
  builtInText: { fontSize: 11, color: '#f5a623', lineHeight: 18 },

  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#13132e', borderWidth: 1, borderRadius: 12,
    padding: 16, marginBottom: 24,
  },
  previewEmoji: { fontSize: 32 },
  previewName: { fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  previewDesc: { fontSize: 11, color: '#5050a0', lineHeight: 16 },

  fieldLabel: {
    fontSize: 9, letterSpacing: 2, color: '#5050a0',
    textTransform: 'uppercase', marginBottom: 8,
  },
  emojiInput: {
    backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a',
    borderRadius: 10, padding: 14, fontSize: 24, color: '#e8e8ff',
    marginBottom: 16, textAlign: 'center', width: 80,
  },
  input: {
    backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a',
    borderRadius: 10, padding: 14, fontSize: 14, color: '#e8e8ff', marginBottom: 16,
  },
  textArea: { minHeight: 80 },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },

  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  saveBtnDisabled: { opacity: 0.3 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  deleteBtn: { alignItems: 'center', padding: 14 },
  deleteBtnText: { fontSize: 12, color: '#f07a7a', letterSpacing: 1 },
});