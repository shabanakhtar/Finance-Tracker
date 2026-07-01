import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Chip, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPalette, radii, spacing } from '@/constants/theme';
import {
  AnimatedCard,
  CharacterCounter,
  EmptyState,
  FormField,
  KeyboardAwareScrollView,
  TypingText,
  triggerSuccess,
  triggerWarning,
  validateAmount,
  validateMaxLength,
} from '@/components/ux';
import { useAppTheme } from '@/contexts/theme';
import { AiLimitStatus, AiLimits, AppApiError, MarketSearchAnswer, askAi, getAiLimits, searchMarket } from '@/services/api';

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

const money = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 0,
  style: 'currency',
  currency: 'PKR',
});
type AiField = 'question' | 'marketProduct' | 'marketPrice' | 'marketCategory';
const QUESTION_LIMIT = 1000;
const PRODUCT_LIMIT = 160;
const CATEGORY_LIMIT = 40;

function getAiUnavailableMessage(error: unknown, feature: 'chat' | 'market') {
  if (error instanceof AppApiError) {
    if (error.kind === 'rate_limit') {
      const suffix = error.limit ? ` (${error.limit.used}/${error.limit.limit} used today)` : '';
      return feature === 'chat'
        ? `You have used today's AI chat limit${suffix}. Your dashboard, transactions, budgets, and CSV tools still work.`
        : `You have used today's market search limit${suffix}. I will not guess prices, so try again tomorrow or compare stores manually.`;
    }
    if (error.kind === 'network' || error.kind === 'timeout' || error.kind === 'backend') {
      const backendMessage = error.message.toLowerCase();
      const marketNeedsConfig =
        feature === 'market' &&
        ['not configured', 'gemini', 'provider', 'grounding', 'api_key', 'search model'].some((token) =>
          backendMessage.includes(token),
        );
      if (marketNeedsConfig) {
        return 'Market search is not fully configured on the backend yet. Your finance tracking still works, but Gemini/Search settings need review before prices can be verified.';
      }
      return feature === 'chat'
        ? 'AI is temporarily unavailable, but core finance tracking still works. Try again when the connection settles.'
        : 'Market search is temporarily unavailable. No recommendation is safer than an unreliable one, so try again later.';
    }
  }
  return error instanceof Error
    ? error.message
    : feature === 'chat'
      ? 'AI is temporarily unavailable. Please try again soon.'
      : 'Market search is temporarily unavailable. Please try again soon.';
}

export default function AiScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask me about your spending, budgets, savings rate, or the warnings on your dashboard.',
    },
  ]);
  const [marketCategory, setMarketCategory] = useState('');
  const [marketResult, setMarketResult] = useState<MarketSearchAnswer | null>(null);
  const [marketPrice, setMarketPrice] = useState('');
  const [marketProduct, setMarketProduct] = useState('');
  const [question, setQuestion] = useState('');
  const [aiLimitError, setAiLimitError] = useState<string | null>(null);
  const [aiLimits, setAiLimits] = useState<AiLimits | null>(null);
  const [loading, setLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);
  const [submitted, setSubmitted] = useState<Record<AiField, boolean>>({
    question: false,
    marketProduct: false,
    marketPrice: false,
    marketCategory: false,
  });

  const questionValidation = useMemo(() => {
    const length = validateMaxLength(question, QUESTION_LIMIT, 'Question');
    if (!length.isValid) return length;
    if (!question.trim()) return { isValid: false, message: 'Question is required.' };
    return { isValid: true };
  }, [question]);
  const productValidation = useMemo(() => {
    const length = validateMaxLength(marketProduct, PRODUCT_LIMIT, 'Product');
    if (!length.isValid) return length;
    if (!marketProduct.trim()) return { isValid: false, message: 'Product is required.' };
    return { isValid: true };
  }, [marketProduct]);
  const marketPriceValidation = useMemo(() => {
    if (!marketPrice.trim()) return { isValid: true };
    return validateAmount(marketPrice);
  }, [marketPrice]);
  const marketCategoryValidation = useMemo(() => validateMaxLength(marketCategory, CATEGORY_LIMIT, 'Category'), [marketCategory]);
  const marketFormIsValid = productValidation.isValid && marketPriceValidation.isValid && marketCategoryValidation.isValid;
  const loadAiLimits = async () => {
    try {
      setAiLimitError(null);
      setAiLimits(await getAiLimits());
    } catch (err) {
      setAiLimitError(err instanceof Error ? err.message : 'Could not load AI limits.');
    }
  };

  useEffect(() => {
    loadAiLimits();
  }, []);

  const markSubmitted = (...fields: AiField[]) => {
    setSubmitted((current) => {
      const next = { ...current };
      fields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  };

  async function submit(nextQuestion = question) {
    const cleaned = nextQuestion.trim();
    const isPreset = nextQuestion !== question;
    if (!cleaned) {
      markSubmitted('question');
      triggerWarning();
      return;
    }
    if (!isPreset && !questionValidation.isValid) {
      markSubmitted('question');
      triggerWarning();
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
      triggerSuccess();
      loadAiLimits();
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
          text: getAiUnavailableMessage(err, 'chat'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function submitMarketSearch() {
    const product = marketProduct.trim();
    const parsedPrice = marketPrice.trim() ? Number(marketPrice) : undefined;

    markSubmitted('marketProduct', 'marketPrice', 'marketCategory');
    if (!marketFormIsValid) {
      triggerWarning();
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
      triggerSuccess();
      loadAiLimits();
      setMarketResult(result);

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-market-assistant`,
          role: 'assistant',
          text: result.response,
        },
      ]);
    } catch (err) {
      const unavailableMessage = getAiUnavailableMessage(err, 'market');
      setMarketResult({
        alternatives: [],
        response: unavailableMessage,
        sources: [],
        verdict: 'No reliable cheaper option could be checked right now.',
        warnings: [
          unavailableMessage.includes('configured')
            ? 'Backend Gemini/Search settings need review before prices can be verified.'
            : 'Prices and stores were not verified because the AI/search service was unavailable.',
        ],
      });
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-market-error`,
          role: 'assistant',
          text: unavailableMessage,
        },
      ]);
    } finally {
      setMarketLoading(false);
    }
  }

  return (
    <KeyboardAwareScrollView containerStyle={styles.keyboard} contentContainerStyle={styles.container}>
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

        <View style={styles.limitPanel}>
          <View style={styles.promptHeader}>
            <Text style={styles.sectionTitle}>Daily AI limits</Text>
            <Button compact mode="text" onPress={loadAiLimits} textColor={colors.sky}>
              Refresh
            </Button>
          </View>
          {aiLimits ? (
            <View style={styles.limitGrid}>
              <LimitCard label="Chat" status={aiLimits.chat} />
              <LimitCard label="Market" status={aiLimits.market} />
              <LimitCard label="Receipts" status={aiLimits.receipt} />
            </View>
          ) : (
            <Text style={styles.panelHint}>{aiLimitError ?? "Loading today's AI usage..."}</Text>
          )}
        </View>

        <View style={styles.chatPanel}>
          {messages.map((message, index) => {
            const shouldType = message.role === 'assistant' && index === messages.length - 1 && message.id !== 'welcome';
            return (
            <AnimatedCard
              key={message.id}
              style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              {shouldType ? (
                <TypingText
                  text={message.text}
                  style={[styles.bubbleText, message.role === 'user' ? styles.userText : styles.assistantText]}
                />
              ) : (
                <Text style={[styles.bubbleText, message.role === 'user' ? styles.userText : styles.assistantText]}>
                  {message.text}
                </Text>
              )}
            </AnimatedCard>
          );
          })}
          {loading ? (
            <View style={[styles.bubble, styles.assistantBubble]}>
              <Text style={styles.assistantText}>Thinking through your latest numbers...</Text>
            </View>
          ) : null}
          {messages.length === 1 ? (
            <EmptyState
              icon="message-question-outline"
              text="Start with a quick question, or use market check to compare a product before buying it again."
              title="Your AI coach is ready"
            />
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

          <FormField
            counter={<CharacterCounter max={PRODUCT_LIMIT} value={marketProduct} />}
            error={productValidation.message}
            label="Product"
            onChangeText={(value) => {
              setMarketProduct(value);
              setMarketResult(null);
            }}
            placeholder="Sea salt hair spray"
            required
            style={styles.input}
            touched={submitted.marketProduct}
            value={marketProduct}
          />

          <View style={styles.marketRow}>
            <FormField
              error={marketPriceValidation.message}
              keyboardType="decimal-pad"
              label="Paid price"
              onChangeText={(value) => {
                setMarketPrice(value);
                setMarketResult(null);
              }}
              placeholder="5000"
              style={[styles.input, styles.marketInput]}
              touched={submitted.marketPrice}
              value={marketPrice}
            />
            <FormField
              autoCapitalize="none"
              counter={<CharacterCounter max={CATEGORY_LIMIT} value={marketCategory} />}
              error={marketCategoryValidation.message}
              label="Category"
              onChangeText={(value) => {
                setMarketCategory(value);
                setMarketResult(null);
              }}
              placeholder="grooming"
              style={[styles.input, styles.marketInput]}
              touched={submitted.marketCategory}
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

          {marketResult ? (
            <View style={styles.marketResults}>
              <Text style={styles.marketVerdict}>{marketResult.verdict}</Text>
              {marketResult.alternatives.length ? (
                marketResult.alternatives.map((item) => (
                  <View key={`${item.name}-${item.url}`} style={styles.altCard}>
                    <View style={styles.altHeader}>
                      <View style={styles.altText}>
                        <Text style={styles.altName}>{item.name}</Text>
                        <Text style={styles.altStore}>{item.store}</Text>
                      </View>
                      <View style={styles.confidencePill}>
                        <Text style={styles.confidenceText}>{item.confidence}</Text>
                      </View>
                    </View>
                    <View style={styles.altNumbers}>
                      <Text style={styles.altPrice}>{money.format(item.price)}</Text>
                      {item.savings ? <Text style={styles.altSavings}>Save {money.format(item.savings)}</Text> : null}
                    </View>
                    <Text style={styles.altReason}>{item.reason}</Text>
                    <Button compact icon="open-in-new" mode="text" onPress={() => Linking.openURL(item.url)} textColor={colors.sky}>
                      Open source
                    </Button>
                  </View>
                ))
              ) : (
                <EmptyState
                  icon="shield-search"
                  text="No reliable cheaper alternative was found. Keep the item if it still fits your budget, and verify prices before switching stores."
                  title="No strong match yet"
                />
              )}
              {marketResult.warnings.map((warning) => (
                <Text key={warning} style={styles.warningText}>
                  {warning}
                </Text>
              ))}
              {marketResult.sources.length ? (
                <View style={styles.sourceList}>
                  <Text style={styles.sourceTitle}>Sources checked</Text>
                  {marketResult.sources.slice(0, 4).map((source) => (
                    <Button
                      compact
                      icon="link-variant"
                      key={source.url}
                      mode="text"
                      onPress={() => Linking.openURL(source.url)}
                      textColor={colors.sky}>
                      {source.title}
                    </Button>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
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

          <FormField
            counter={<CharacterCounter max={QUESTION_LIMIT} value={question} />}
            error={questionValidation.message}
            label="Ask a question"
            multiline
            numberOfLines={3}
            onChangeText={setQuestion}
            placeholder="Example: What category should I cut back on first?"
            required
            style={[styles.input, styles.questionInput]}
            touched={submitted.question}
            value={question}
          />

          <Button
            disabled={loading}
            icon="send-outline"
            loading={loading}
            mode="contained"
            onPress={() => {
              markSubmitted('question');
              submit();
            }}
            style={styles.button}>
            Send
          </Button>
        </View>
    </KeyboardAwareScrollView>
  );
}

function LimitCard({ label, status }: { label: string; status: AiLimitStatus }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const usedRatio = status.limit > 0 ? Math.min(status.used / status.limit, 1) : 0;
  const isEmpty = status.remaining <= 0;

  return (
    <View style={[styles.limitCard, isEmpty ? styles.limitCardEmpty : null]}>
      <View style={styles.limitRow}>
        <Text style={styles.limitLabel}>{label}</Text>
        <Text style={[styles.limitCount, isEmpty ? styles.limitCountEmpty : null]}>
          {status.remaining}/{status.limit}
        </Text>
      </View>
      <View style={styles.limitTrack}>
        <View style={[styles.limitFill, { backgroundColor: isEmpty ? colors.coral : colors.sky, width: `${usedRatio * 100}%` }]} />
      </View>
      <Text style={styles.limitMeta}>Used {status.used} today</Text>
    </View>
  );
}

function createStyles(colors: AppPalette, bottomInset = 0) {
  return StyleSheet.create({
    assistantBubble: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surface2,
      borderColor: colors.border,
      borderWidth: 1,
    },
    altCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    altHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    altName: {
      color: colors.ink,
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '800',
      lineHeight: 20,
    },
    altNumbers: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    altPrice: {
      color: colors.ink,
      fontSize: 17,
      fontWeight: '900',
    },
    altReason: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    altSavings: {
      color: colors.emerald,
      fontSize: 13,
      fontWeight: '800',
    },
    altStore: {
      color: colors.muted,
      fontSize: 13,
      marginTop: 2,
    },
    altText: {
      flex: 1,
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
      paddingBottom: Math.max(132, bottomInset + 120),
    },
    confidencePill: {
      backgroundColor: colors.violetSoft,
      borderRadius: radii.card,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    confidenceText: {
      color: colors.ink,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
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
    limitCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      flex: 1,
      gap: spacing.xs,
      minWidth: 96,
      padding: spacing.md,
    },
    limitCardEmpty: {
      backgroundColor: colors.coralSoft,
    },
    limitCount: {
      color: colors.sky,
      fontSize: 13,
      fontWeight: '900',
    },
    limitCountEmpty: {
      color: colors.coral,
    },
    limitFill: {
      borderRadius: radii.pill,
      height: '100%',
    },
    limitGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    limitLabel: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    limitMeta: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    limitPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.card,
      borderWidth: 1,
      padding: spacing.lg,
    },
    limitRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    limitTrack: {
      backgroundColor: colors.surface2,
      borderRadius: radii.pill,
      height: 6,
      overflow: 'hidden',
    },
    input: {
      backgroundColor: colors.surface,
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
    marketResults: {
      gap: spacing.md,
      marginTop: spacing.md,
    },
    marketRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    marketVerdict: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '800',
      lineHeight: 20,
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
    sourceList: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      gap: spacing.xs,
      paddingTop: spacing.sm,
    },
    sourceTitle: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    questionInput: {
      minHeight: 100,
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
    warningText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
    },
  });
}
