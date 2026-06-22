import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Chip, Text, TextInput } from 'react-native-paper';

import { AppPalette, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme';
import { askAi, searchMarket } from '@/services/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const suggestions = [
  'What should I improve first?',
  'Where am I overspending?',
  'How can I save more this month?',
  'Explain my budget warnings.',
];

export default function AiScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask me about your spending, budgets, savings rate, or the warnings on your dashboard.',
    },
  ]);
  const [marketCategory, setMarketCategory] = useState('');
  const [marketPrice, setMarketPrice] = useState('');
  const [marketProduct, setMarketProduct] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);

  async function submit(nextQuestion = question) {
    const cleaned = nextQuestion.trim();
    if (!cleaned) {
      Alert.alert('Ask a question', 'Type a finance question first.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: cleaned,
    };

    setQuestion('');
    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const result = await askAi(cleaned);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: result.response,
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          text: err instanceof Error ? err.message : 'AI is temporarily unavailable. Please try again soon.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function submitMarketSearch() {
    const product = marketProduct.trim();
    const parsedPrice = marketPrice.trim() ? Number(marketPrice) : undefined;

    if (!product) {
      Alert.alert('Product needed', 'Enter a product name first.');
      return;
    }

    if (parsedPrice !== undefined && (!parsedPrice || parsedPrice <= 0)) {
      Alert.alert('Check price', 'Enter a price greater than zero, or leave it blank.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-market-user`,
      role: 'user',
      text: `Find cheaper local alternatives for ${product}${parsedPrice ? ` around PKR ${parsedPrice}` : ''}.`,
    };

    setMessages((current) => [...current, userMessage]);
    setMarketLoading(true);

    try {
      const result = await searchMarket({
        product_name: product,
        current_price: parsedPrice,
        category: marketCategory.trim() || undefined,
        location: 'Pakistan',
      });
      const sources = result.sources.length
        ? `\n\nSources:\n${result.sources.map((source) => `- ${source.title}: ${source.url}`).join('\n')}`
        : '';

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-market-assistant`,
          role: 'assistant',
          text: `${result.response}${sources}`,
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-market-error`,
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Market search is temporarily unavailable. Please try again soon.',
        },
      ]);
    } finally {
      setMarketLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboard}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.iconShell}>
            <MaterialCommunityIcons color={colors.violet} name="creation-outline" size={28} />
          </View>
          <Text style={styles.eyebrow}>AI finance assistant</Text>
          <Text style={styles.title}>Ask about your money patterns.</Text>
          <Text style={styles.subtitle}>
            The assistant reads your transactions, budgets, warnings, and score before answering.
          </Text>
        </View>

        <View style={styles.chatPanel}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleText, message.role === 'user' ? styles.userText : styles.assistantText]}>
                {message.text}
              </Text>
            </View>
          ))}
          {loading ? (
            <View style={[styles.bubble, styles.assistantBubble]}>
              <Text style={styles.assistantText}>Thinking through your latest numbers...</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.panel}>
          <View style={styles.marketHeader}>
            <View style={styles.marketIcon}>
              <MaterialCommunityIcons color={colors.sky} name="tag-search-outline" size={20} />
            </View>
            <View style={styles.marketHeaderText}>
              <Text style={styles.sectionTitle}>Local market check</Text>
              <Text style={styles.panelHint}>Search Pakistan sources for cheaper options before buying again.</Text>
            </View>
          </View>

          <TextInput
            activeOutlineColor={colors.sky}
            label="Product"
            mode="outlined"
            onChangeText={setMarketProduct}
            outlineColor={colors.border}
            placeholder="Sea salt hair spray"
            style={styles.input}
            value={marketProduct}
          />

          <View style={styles.marketRow}>
            <TextInput
              activeOutlineColor={colors.sky}
              keyboardType="decimal-pad"
              label="Paid price"
              mode="outlined"
              onChangeText={setMarketPrice}
              outlineColor={colors.border}
              placeholder="5000"
              style={[styles.input, styles.marketInput]}
              value={marketPrice}
            />
            <TextInput
              activeOutlineColor={colors.sky}
              autoCapitalize="none"
              label="Category"
              mode="outlined"
              onChangeText={setMarketCategory}
              outlineColor={colors.border}
              placeholder="grooming"
              style={[styles.input, styles.marketInput]}
              value={marketCategory}
            />
          </View>

          <Button
            disabled={marketLoading || loading}
            icon="magnify"
            loading={marketLoading}
            mode="contained"
            onPress={submitMarketSearch}
            style={styles.button}>
            Check Alternatives
          </Button>
        </View>

        <View style={styles.panel}>
          <View style={styles.promptHeader}>
            <Text style={styles.sectionTitle}>Quick questions</Text>
            {messages.length > 1 ? (
              <Button compact mode="text" onPress={() => setMessages([messages[0]])} textColor={colors.muted}>
                Clear
              </Button>
            ) : null}
          </View>
          <View style={styles.chips}>
            {suggestions.map((item) => (
              <Chip
                compact
                disabled={loading}
                key={item}
                mode="outlined"
                onPress={() => submit(item)}
                style={styles.chip}
                textStyle={styles.chipText}>
                {item}
              </Chip>
            ))}
          </View>

          <TextInput
            activeOutlineColor={colors.sky}
            label="Ask a question"
            mode="outlined"
            multiline
            numberOfLines={3}
            onChangeText={setQuestion}
            outlineColor={colors.border}
            placeholder="Example: What category should I cut back on first?"
            style={styles.input}
            value={question}
          />

          <Button
            disabled={loading}
            icon="send-outline"
            loading={loading}
            mode="contained"
            onPress={() => submit()}
            style={styles.button}>
            Send
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    assistantBubble: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surface2,
      borderColor: colors.border,
      borderWidth: 1,
    },
    assistantText: {
      color: colors.ink,
    },
    bubble: {
      borderRadius: radii.card,
      maxWidth: '88%',
      padding: spacing.md,
    },
    bubbleText: {
      fontSize: 15,
      lineHeight: 22,
    },
    button: {
      borderRadius: radii.card,
      marginTop: spacing.md,
    },
    chatPanel: {
      gap: spacing.md,
    },
    chip: {
      backgroundColor: colors.skySoft,
      borderColor: colors.border,
    },
    chipText: {
      color: colors.ink,
      fontWeight: '700',
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    container: {
      backgroundColor: colors.background,
      gap: spacing.lg,
      padding: spacing.lg,
      paddingBottom: 96,
    },
    eyebrow: {
      color: colors.violet,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    hero: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      padding: spacing.xl,
    },
    iconShell: {
      alignItems: 'center',
      backgroundColor: colors.violetSoft,
      borderRadius: radii.card,
      height: 48,
      justifyContent: 'center',
      marginBottom: spacing.lg,
      width: 48,
    },
    input: {
      backgroundColor: colors.surface,
      minHeight: 100,
    },
    keyboard: {
      flex: 1,
    },
    marketHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    marketHeaderText: {
      flex: 1,
    },
    marketIcon: {
      alignItems: 'center',
      backgroundColor: colors.skySoft,
      borderRadius: radii.card,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    marketInput: {
      flex: 1,
    },
    marketRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      padding: spacing.lg,
    },
    panelHint: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
    },
    promptHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 17,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.sm,
    },
    title: {
      color: colors.ink,
      fontSize: 30,
      fontWeight: '900',
      letterSpacing: 0,
      lineHeight: 36,
      marginTop: spacing.xs,
    },
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: colors.sky,
    },
    userText: {
      color: '#ffffff',
      fontWeight: '700',
    },
  });
}
