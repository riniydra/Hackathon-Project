"use client";
import { tokens, styles } from "@/lib/tokens";
import { ThemeToggle } from "@/lib/theme";

export default function DesignTokenDemo() {
  return (
    <div style={{
      padding: tokens.space(6),
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: tokens.font.family.sans
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: tokens.space(8),
        padding: tokens.space(6),
        backgroundColor: tokens.bg.surface,
        borderRadius: tokens.radius.xl,
        border: `1px solid ${tokens.border.primary}`,
        boxShadow: tokens.shadow.base
      }}>
        <div>
          <h1 style={{
            fontSize: tokens.font.size['3xl'],
            fontWeight: tokens.font.weight.bold,
            color: tokens.text.primary,
            margin: 0,
            marginBottom: tokens.space(2)
          }}>
            Design Tokens Demo
          </h1>
          <p style={{
            fontSize: tokens.font.size.lg,
            color: tokens.text.secondary,
            margin: 0
          }}>
            Showcasing the design system
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Typography Scale */}
      <section style={{ marginBottom: tokens.space(10) }}>
        <h2 style={{
          fontSize: tokens.font.size['2xl'],
          fontWeight: tokens.font.weight.semibold,
          color: tokens.text.primary,
          marginBottom: tokens.space(6)
        }}>
          Typography Scale
        </h2>
        <div style={{
          padding: tokens.space(6),
          backgroundColor: tokens.bg.surface,
          borderRadius: tokens.radius.xl,
          border: `1px solid ${tokens.border.primary}`
        }}>
          {(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] as const).map(size => (
            <div key={size} style={{ marginBottom: tokens.space(4) }}>
              <span style={{
                fontSize: tokens.font.size[size],
                color: tokens.text.primary,
                display: 'block'
              }}>
                {size}: The quick brown fox jumps over the lazy dog
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Color Palette */}
      <section style={{ marginBottom: tokens.space(10) }}>
        <h2 style={{
          fontSize: tokens.font.size['2xl'],
          fontWeight: tokens.font.weight.semibold,
          color: tokens.text.primary,
          marginBottom: tokens.space(6)
        }}>
          Color Palette
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: tokens.space(6)
        }}>
          {/* Primary Colors */}
          <div>
            <h3 style={{
              fontSize: tokens.font.size.lg,
              fontWeight: tokens.font.weight.medium,
              color: tokens.text.primary,
              marginBottom: tokens.space(4)
            }}>
              Primary
            </h3>
            <div style={{ display: 'grid', gap: tokens.space(2) }}>
              {(['100', '200', '300', '400', '500', '600', '700', '800'] as const).map(shade => (
                <div key={shade} style={{
                  backgroundColor: tokens.color.primary(shade),
                  padding: tokens.space(3),
                  borderRadius: tokens.radius.md,
                  color: ['100', '200', '300', '400'].includes(shade) ? tokens.text.primary : tokens.text.inverse,
                  fontSize: tokens.font.size.sm,
                  fontWeight: tokens.font.weight.medium
                }}>
                  {shade}
                </div>
              ))}
            </div>
          </div>

          {/* Neutral Colors */}
          <div>
            <h3 style={{
              fontSize: tokens.font.size.lg,
              fontWeight: tokens.font.weight.medium,
              color: tokens.text.primary,
              marginBottom: tokens.space(4)
            }}>
              Neutral
            </h3>
            <div style={{ display: 'grid', gap: tokens.space(2) }}>
              {(['100', '200', '300', '400', '500', '600', '700', '800'] as const).map(shade => (
                <div key={shade} style={{
                  backgroundColor: tokens.color.neutral(shade),
                  padding: tokens.space(3),
                  borderRadius: tokens.radius.md,
                  color: ['100', '200', '300', '400'].includes(shade) ? tokens.text.primary : tokens.text.inverse,
                  fontSize: tokens.font.size.sm,
                  fontWeight: tokens.font.weight.medium
                }}>
                  {shade}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Spacing Scale */}
      <section style={{ marginBottom: tokens.space(10) }}>
        <h2 style={{
          fontSize: tokens.font.size['2xl'],
          fontWeight: tokens.font.weight.semibold,
          color: tokens.text.primary,
          marginBottom: tokens.space(6)
        }}>
          Spacing Scale
        </h2>
        <div style={{
          padding: tokens.space(6),
          backgroundColor: tokens.bg.surface,
          borderRadius: tokens.radius.xl,
          border: `1px solid ${tokens.border.primary}`
        }}>
          {(['1', '2', '3', '4', '6', '8', '10', '12', '16', '20'] as const).map(size => (
            <div key={size} style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: tokens.space(4),
              gap: tokens.space(4)
            }}>
              <span style={{
                fontSize: tokens.font.size.sm,
                color: tokens.text.secondary,
                minWidth: '40px'
              }}>
                {size}:
              </span>
              <div style={{
                width: tokens.space(size),
                height: tokens.space(4),
                backgroundColor: tokens.color.primary('400'),
                borderRadius: tokens.radius.sm
              }} />
              <span style={{
                fontSize: tokens.font.size.xs,
                color: tokens.text.tertiary,
                fontFamily: tokens.font.family.mono
              }}>
                {tokens.space(size)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Button Components */}
      <section style={{ marginBottom: tokens.space(10) }}>
        <h2 style={{
          fontSize: tokens.font.size['2xl'],
          fontWeight: tokens.font.weight.semibold,
          color: tokens.text.primary,
          marginBottom: tokens.space(6)
        }}>
          Button Variants
        </h2>
        <div style={{
          padding: tokens.space(6),
          backgroundColor: tokens.bg.surface,
          borderRadius: tokens.radius.xl,
          border: `1px solid ${tokens.border.primary}`,
          display: 'flex',
          gap: tokens.space(4),
          flexWrap: 'wrap'
        }}>
          <button style={styles.button.primary}>
            Primary Button
          </button>
          <button style={styles.button.secondary}>
            Secondary Button
          </button>
          <button style={{
            ...styles.button.secondary,
            backgroundColor: tokens.text.success,
            color: tokens.text.inverse,
            borderColor: tokens.text.success
          }}>
            Success Button
          </button>
          <button style={{
            ...styles.button.secondary,
            backgroundColor: tokens.text.error,
            color: tokens.text.inverse,
            borderColor: tokens.text.error
          }}>
            Error Button
          </button>
        </div>
      </section>

      {/* Card Examples */}
      <section style={{ marginBottom: tokens.space(10) }}>
        <h2 style={{
          fontSize: tokens.font.size['2xl'],
          fontWeight: tokens.font.weight.semibold,
          color: tokens.text.primary,
          marginBottom: tokens.space(6)
        }}>
          Card Variants
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: tokens.space(6)
        }}>
          <div style={styles.card.base}>
            <h3 style={{
              fontSize: tokens.font.size.lg,
              fontWeight: tokens.font.weight.semibold,
              color: tokens.text.primary,
              margin: 0,
              marginBottom: tokens.space(3)
            }}>
              Base Card
            </h3>
            <p style={{
              fontSize: tokens.font.size.sm,
              color: tokens.text.secondary,
              margin: 0,
              lineHeight: tokens.font.lineHeight.relaxed
            }}>
              This is a base card with standard styling using design tokens.
            </p>
          </div>
          
          <div style={styles.card.elevated}>
            <h3 style={{
              fontSize: tokens.font.size.lg,
              fontWeight: tokens.font.weight.semibold,
              color: tokens.text.primary,
              margin: 0,
              marginBottom: tokens.space(3)
            }}>
              Elevated Card
            </h3>
            <p style={{
              fontSize: tokens.font.size.sm,
              color: tokens.text.secondary,
              margin: 0,
              lineHeight: tokens.font.lineHeight.relaxed
            }}>
              This is an elevated card with enhanced shadow and background.
            </p>
          </div>
        </div>
      </section>

      {/* Semantic Colors */}
      <section>
        <h2 style={{
          fontSize: tokens.font.size['2xl'],
          fontWeight: tokens.font.weight.semibold,
          color: tokens.text.primary,
          marginBottom: tokens.space(6)
        }}>
          Semantic Colors
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: tokens.space(4)
        }}>
          <div style={{
            padding: tokens.space(4),
            backgroundColor: tokens.bg.accent,
            border: `1px solid ${tokens.color.success('500')}`,
            borderRadius: tokens.radius.lg
          }}>
            <span style={{
              color: tokens.text.success,
              fontWeight: tokens.font.weight.medium
            }}>
              ✓ Success Message
            </span>
          </div>
          
          <div style={{
            padding: tokens.space(4),
            backgroundColor: tokens.bg.accent,
            border: `1px solid ${tokens.color.warning('500')}`,
            borderRadius: tokens.radius.lg
          }}>
            <span style={{
              color: tokens.text.warning,
              fontWeight: tokens.font.weight.medium
            }}>
              ⚠ Warning Message
            </span>
          </div>
          
          <div style={{
            padding: tokens.space(4),
            backgroundColor: tokens.bg.accent,
            border: `1px solid ${tokens.color.error('500')}`,
            borderRadius: tokens.radius.lg
          }}>
            <span style={{
              color: tokens.text.error,
              fontWeight: tokens.font.weight.medium
            }}>
              ✕ Error Message
            </span>
          </div>
          
          <div style={{
            padding: tokens.space(4),
            backgroundColor: tokens.bg.accent,
            border: `1px solid ${tokens.color.info('500')}`,
            borderRadius: tokens.radius.lg
          }}>
            <span style={{
              color: tokens.text.info,
              fontWeight: tokens.font.weight.medium
            }}>
              ℹ Info Message
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}