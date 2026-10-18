import { SCRIPTS, wordText, type CaptionLine, type CaptionTemplate, type Script } from '@lafz/core';
import { Text, View, type TextStyle } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

const FONTS: Record<Script, Record<CaptionTemplate['weight'], string>> = {
  roman: { regular: 'Inter_600SemiBold', bold: 'Inter_800ExtraBold' },
  urdu: { regular: 'NotoNastaliqUrdu_400Regular', bold: 'NotoNastaliqUrdu_700Bold' },
  hindi: { regular: 'NotoSansDevanagari_600SemiBold', bold: 'NotoSansDevanagari_700Bold' },
};

const ENTRANCE = {
  pop: ZoomIn.duration(160),
  fade: FadeIn.duration(220),
  none: undefined,
} as const;

type CaptionLineViewProps = {
  line: CaptionLine;
  activeIndex: number;
  template: CaptionTemplate;
  script: Script;
  /** Width of the video frame in points; all sizes scale from it. */
  frameWidth: number;
};

/**
 * Live preview of one caption line. Mirrors what the export renderer draws
 * from the same template spec. React Native has no text stroke, so the stroke
 * is approximated with a tight shadow here; the MP4 export draws a real one.
 * Give it `key={line.id}` so each new line replays the entrance animation.
 */
export function CaptionLineView({
  line,
  activeIndex,
  template,
  script,
  frameWidth,
}: CaptionLineViewProps) {
  const info = SCRIPTS[script];
  const fontSize = frameWidth * template.size;
  const lineHeight = fontSize * info.lineHeight;
  const outline = template.stroke
    ? { color: template.stroke.color, radius: template.stroke.width * fontSize }
    : template.shadow
      ? { color: 'rgba(0,0,0,0.55)', radius: fontSize * 0.18 }
      : undefined;

  return (
    <Animated.View
      entering={ENTRANCE[template.entrance]}
      style={{
        flexDirection: info.direction === 'rtl' ? 'row-reverse' : 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        columnGap: fontSize * 0.28,
        paddingHorizontal: template.plate ? fontSize * 0.45 : 0,
        paddingVertical: template.plate ? fontSize * 0.15 : 0,
        backgroundColor: template.plate?.color,
        borderRadius: template.plate ? template.plate.radius * frameWidth : 0,
        maxWidth: frameWidth * 0.86,
      }}
    >
      {line.words.map((word, i) => {
        const active = i === activeIndex;
        const raw = wordText(word, script);
        const text = template.uppercase && script === 'roman' ? raw.toUpperCase() : raw;
        const boxed = active && template.highlight === 'box';

        const style: TextStyle = {
          fontFamily: FONTS[script][template.weight],
          fontSize,
          lineHeight,
          color: active && !boxed ? template.highlightColor : template.textColor,
          writingDirection: info.direction,
          includeFontPadding: false,
          textShadowColor: boxed ? 'transparent' : outline?.color,
          textShadowRadius: outline?.radius,
          textShadowOffset: { width: 0, height: outline ? fontSize * 0.03 : 0 },
          textDecorationLine: active && template.highlight === 'underline' ? 'underline' : 'none',
          textDecorationColor: template.highlightColor,
          transform: [{ scale: active && template.highlight === 'scale' ? 1.12 : 1 }],
        };

        return (
          <View
            key={word.id}
            style={{
              backgroundColor: boxed ? template.highlightColor : 'transparent',
              borderRadius: fontSize * 0.22,
              paddingHorizontal: boxed ? fontSize * 0.18 : 0,
            }}
          >
            <Text style={style}>{text}</Text>
          </View>
        );
      })}
    </Animated.View>
  );
}
