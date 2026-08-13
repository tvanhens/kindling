import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ComponentPropsWithoutRef, ElementType, ReactNode, Ref } from "react";

import { gaps, padX, padY, pad, surfaces } from "./box";
import type { SpaceToken, SurfaceToken } from "./box";

const styles = stylex.create({
  root: {
    display: "flex",
    minWidth: 0,
  },
  wrap: { flexWrap: "wrap" },
  grow: { flexGrow: 1 },
  inline: { display: "inline-flex" },
});

const aligns = stylex.create({
  baseline: { alignItems: "baseline" },
  center: { alignItems: "center" },
  end: { alignItems: "flex-end" },
  start: { alignItems: "flex-start" },
  stretch: { alignItems: "stretch" },
});

const justifies = stylex.create({
  around: { justifyContent: "space-around" },
  between: { justifyContent: "space-between" },
  center: { justifyContent: "center" },
  end: { justifyContent: "flex-end" },
  start: { justifyContent: "flex-start" },
});

const directions = stylex.create({
  column: { flexDirection: "column" },
  columnReverse: { flexDirection: "column-reverse" },
  row: { flexDirection: "row" },
  rowReverse: { flexDirection: "row-reverse" },
});

export type StackDirection = keyof typeof directions;
export type StackAlign = keyof typeof aligns;
export type StackJustify = keyof typeof justifies;

export type StackOwnProps = {
  align?: StackAlign;
  as?: ElementType;
  background?: SurfaceToken;
  children?: ReactNode;
  direction?: StackDirection;
  gap?: SpaceToken;
  /** `flex-grow: 1` on the stack itself. */
  grow?: boolean;
  inline?: boolean;
  justify?: StackJustify;
  padding?: SpaceToken;
  paddingX?: SpaceToken;
  paddingY?: SpaceToken;
  ref?: Ref<HTMLElement>;
  style?: StyleXStyles;
  wrap?: boolean;
};

export type StackProps = StackOwnProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof StackOwnProps | "className">;

/**
 * Flexbox with the fiddly parts named. Use it for essentially all layout;
 * reach for `Box` only when you need a plain padded container.
 */
export function Stack({
  align,
  as: Component = "div",
  background = "none",
  children,
  direction = "column",
  gap = "none",
  grow = false,
  inline = false,
  justify,
  padding,
  paddingX,
  paddingY,
  ref,
  style,
  wrap = false,
  ...rest
}: StackProps) {
  return (
    <Component
      ref={ref}
      {...rest}
      {...stylex.props(
        styles.root,
        inline && styles.inline,
        directions[direction],
        gaps[gap],
        align !== undefined && aligns[align],
        justify !== undefined && justifies[justify],
        wrap && styles.wrap,
        grow && styles.grow,
        surfaces[background],
        padding !== undefined && pad[padding],
        paddingX !== undefined && padX[paddingX],
        paddingY !== undefined && padY[paddingY],
        style,
      )}
    >
      {children}
    </Component>
  );
}

/** Convenience alias: a horizontal `Stack`, centered by default. */
export function Row({ align = "center", ...props }: StackProps) {
  return <Stack align={align} direction="row" {...props} />;
}
