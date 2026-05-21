# Requirements Document

## Introduction

本规格定义"二维码模板生成"(QR Template Generator) 功能。该功能作为现有扩展弹窗 (Popup) 内二维码生成功能的**模式扩展**，通过模式切换开关在同一 UI 中提供模板化二维码生成能力。

核心设计意图：

1. 在现有 Popup 二维码 UI 中新增"模板模式"开关，切换后进入模板选择与占位符编辑界面
2. 模板模式下，用户选择已有模板后只能修改占位符部分的取值，不能编辑模板字符串本身
3. 模板相关数据（模板定义、占位符候选值、组合标签）在独立的 localStorage 键下维护，与现有 `qrcode-history` 完全隔离
4. 非模板模式下，原有二维码生成流程（自由文本输入 → 确认 → 生成二维码 → 历史记录 → 标签）保持不变

## Glossary

- **Popup_QR_Feature**: 扩展弹窗内已有的二维码生成功能，源代码位于 `src/features/qr-code-gen/`，使用 localStorage 键 `qrcode-history`，包含 InputSection、HistoryList、QrDisplay 等组件。
- **Template_Mode**: 模板模式，Popup_QR_Feature 内的一种 UI 状态。开启后显示模板选择与占位符编辑界面，关闭后恢复原有自由文本输入界面。
- **Free_Mode**: 自由模式，即原有的二维码生成模式，用户直接输入文本内容生成二维码。
- **Mode_Switch**: 模式切换控件，位于 Popup_QR_Feature 的 InputSection 区域，用于在 Free_Mode 和 Template_Mode 之间切换。
- **Template**: 模板对象，包含唯一 ID、用户可编辑的名称、Template_String、创建时间戳、最近更新时间戳。
- **Template_String**: 模板字符串，由静态文本和零个或多个 Placeholder_Token 组成。
- **Placeholder_Token**: 占位符标记，遵循语法 `{name}`，其中 `name` 由字母、数字、下划线和连字符组成（正则 `[A-Za-z0-9_-]+`）。
- **Placeholder**: 模板字符串中出现过的某个 `name` 的逻辑表示，由 `name` 唯一标识，对应一个候选值集合。
- **Placeholder_Value**: 占位符的候选值，是一个非空字符串。
- **Combination_Tag**: 组合标签。在某个模板下，把每个 Placeholder 到具体 Placeholder_Value 的映射保存为一个具名记录，以便后续一键召回。
- **Final_String**: 把全部 Placeholder_Token 替换为对应 Placeholder_Value 后得到的模板渲染结果，作为二维码的实际内容。
- **Template_Parser**: 解析 Template_String 为静态片段与 Placeholder_Token 序列的纯函数组件。
- **Template_Pretty_Printer**: 把解析后的片段序列还原为 Template_String 的纯函数组件。
- **Template_Renderer**: 把一组 Placeholder 到 Placeholder_Value 的映射代入 Template_String 生成 Final_String 的纯函数组件。
- **Template_Store**: 模板功能的本地持久化层，使用 localStorage 键 `qrcode-template-store`，存储所有模板定义、占位符候选值、组合标签。
- **Template_Manager**: 模板的 CRUD 与列表展示组件，仅在 Template_Mode 下可见。
- **Placeholder_Editor**: 模板模式下的占位符值编辑区域，展示当前模板的所有占位符及其候选值选择器。
- **Import_Export_Service**: 负责模板、占位符候选值、组合标签的 JSON 文件导入导出的组件。
- **QR_Renderer**: 把 Final_String 渲染为二维码图像的组件，基于已有依赖 `qrcode.react`。

## Requirements

### Requirement 1: 模式切换

**User Story:** 作为扩展用户，我希望在弹窗二维码界面中通过开关切换"自由模式"和"模板模式"，以便在需要时使用模板化生成功能。

#### Acceptance Criteria

1. THE Popup_QR_Feature SHALL display a Mode_Switch control in the InputSection area, defaulting to Free_Mode on initial load.
2. WHEN the user toggles the Mode_Switch to Template_Mode, THE Popup_QR_Feature SHALL hide the free text input area and display the Template_Manager and Placeholder_Editor interface.
3. WHEN the user toggles the Mode_Switch back to Free_Mode, THE Popup_QR_Feature SHALL hide the Template_Manager and Placeholder_Editor interface and restore the original free text input area with its previous state intact.
4. WHILE in Free_Mode, THE Popup_QR_Feature SHALL behave identically to the current implementation including text input, confirm, history list, tag management, and QR display.
5. THE Mode_Switch state SHALL be stored in component memory only and SHALL default to Free_Mode on every popup open.

### Requirement 2: 数据隔离保证

**User Story:** 作为扩展用户，我希望模板功能的数据与原有二维码历史数据完全隔离，以便两个模式互不干扰、不丢失任何数据。

#### Acceptance Criteria

1. THE Template_Store SHALL persist all template-related data exclusively under the localStorage key `qrcode-template-store`.
2. THE Popup_QR_Feature SHALL persist all its data exclusively under the localStorage key `qrcode-history`.
3. WHEN the user creates, edits, or deletes a Template, a Placeholder_Value, or a Combination_Tag in Template_Mode, THE Popup_QR_Feature history list and tag list SHALL remain byte-equal to the state immediately before the operation.
4. WHEN the user creates, edits, or deletes a record in Free_Mode, THE Template_Store templates, placeholder values, and combination tags SHALL remain byte-equal to the state immediately before the operation.
5. THE Template_Mode source code SHALL import no symbols from the existing `src/features/qr-code-gen/context.tsx` state management, and SHALL maintain its own independent React context or state hooks for template data.

### Requirement 3: 模板的增删改查

**User Story:** 作为用户，我想在模板模式下创建、编辑、删除模板，以便复用不同业务场景下的二维码生成规则。

#### Acceptance Criteria

1. WHILE in Template_Mode, THE Template_Manager SHALL display the saved Template list ordered by `updatedAt` descending.
2. WHEN the user submits a new Template with a non-empty name and a non-empty Template_String, THE Template_Manager SHALL persist the Template with a freshly generated unique ID, the current timestamp as `createdAt`, and the same value as `updatedAt`.
3. WHEN the user updates an existing Template's name or Template_String, THE Template_Manager SHALL save the new values and refresh the Template's `updatedAt` to the current timestamp.
4. WHEN the user confirms deletion of a Template, THE Template_Manager SHALL remove the Template, remove all Placeholder_Value lists keyed under that Template, and remove all Combination_Tags whose `templateId` equals that Template's ID.
5. IF the user attempts to save a Template with an empty or whitespace-only name, THEN THE Template_Manager SHALL reject the operation and display the message "模板名称不能为空".
6. IF the user attempts to save a Template with an empty or whitespace-only Template_String, THEN THE Template_Manager SHALL reject the operation and display the message "模板内容不能为空".
7. IF the user attempts to save a Template whose name equals the name of another existing Template under case-sensitive comparison, THEN THE Template_Manager SHALL reject the operation and display the message "模板名称已存在".
8. IF the user attempts to save a Template whose Template_String produces a Template_Parser error, THEN THE Template_Manager SHALL reject the operation and display the parser error message produced by Requirement 4.

### Requirement 4: 模板字符串中的占位符语法与解析

**User Story:** 作为用户，我希望在模板字符串中通过 `{name}` 语法标注占位符，以便后续动态替换为不同候选值。

#### Acceptance Criteria

1. THE Template_Parser SHALL recognize a Placeholder_Token as the substring matching the regular expression `\{[A-Za-z0-9_-]+\}`.
2. THE Template_Parser SHALL produce an ordered segment list where each segment is either a literal text fragment or a Placeholder_Token referencing a Placeholder name.
3. THE Template_Parser SHALL produce a deduplicated list of Placeholder names in first-occurrence order.
4. WHEN a Template_String contains the literal substring `{{`, THE Template_Parser SHALL emit the literal character `{` in the segment list at that position.
5. WHEN a Template_String contains the literal substring `}}`, THE Template_Parser SHALL emit the literal character `}` in the segment list at that position.
6. WHERE a single Template_String references the same Placeholder name multiple times, THE Template_Parser SHALL list the name exactly once in the deduplicated Placeholder name list and emit each occurrence in the segment list.
7. IF a Template_String contains a `{` that is neither part of `{{` nor closed by a matching `}` according to Acceptance Criterion 1, THEN THE Template_Parser SHALL emit a parse error containing the 1-based character offset of the offending `{` and the message "未闭合的占位符".
8. IF a Template_String contains the substring `{}`, THEN THE Template_Parser SHALL emit a parse error with the message "占位符名称不能为空".
9. IF a Template_String contains a `{` followed by characters not matching `[A-Za-z0-9_-]+\}`, THEN THE Template_Parser SHALL emit a parse error with the message "占位符名称仅允许字母、数字、下划线和连字符".
10. THE Template_Parser SHALL return a result object containing both a (possibly partial) segment list and an ordered list of parse errors so the editor can render a best-effort preview while still surfacing all errors.
11. THE Template_Parser SHALL continue scanning after each parse error and SHALL include every detected parse error in the returned error list rather than stopping at the first error.
12. THE Template_Pretty_Printer SHALL format a segment list back into a valid Template_String by escaping literal `{` as `{{` and literal `}` as `}}`.

### Requirement 5: 模板模式下的受限编辑

**User Story:** 作为用户，我希望选择模板后只能修改占位符的取值，不能编辑模板字符串本身，以便保证模板结构的一致性。

#### Acceptance Criteria

1. WHEN the user selects a Template in Template_Mode, THE Placeholder_Editor SHALL display the Template_String as a read-only preview with Placeholder_Tokens visually highlighted.
2. WHILE a Template is selected in Template_Mode, THE Placeholder_Editor SHALL display one editable selector or input per Placeholder of the Template, populated with that Placeholder's candidate values from the Template_Store.
3. WHILE a Template is selected in Template_Mode, THE Popup_QR_Feature SHALL NOT provide any control to modify the Template_String directly; editing the Template_String SHALL only be possible through the Template_Manager's dedicated edit flow.
4. WHERE the user types a non-empty custom value into a Placeholder's input field, THE Placeholder_Editor SHALL treat the typed string as the active value for that Placeholder for the current Final_String without writing it to the Template_Store.
5. WHEN the user clicks "保存为候选值" on a custom input value, THE Template_Store SHALL append the value to that Placeholder's candidate list following the deduplication rule in Requirement 6.

### Requirement 6: 占位符候选值的管理

**User Story:** 作为用户，我想为每个占位符维护一个候选值集合，以便从中挑选取值快速生成二维码。

#### Acceptance Criteria

1. THE Template_Store SHALL associate each `(templateId, placeholderName)` pair with an ordered list of distinct Placeholder_Values.
2. WHEN the user adds a Placeholder_Value to a Placeholder, THE Template_Store SHALL append the value at the end of the Placeholder's list if no equal value already exists in that list.
3. WHEN the user deletes a Placeholder_Value, THE Template_Store SHALL remove only the matching value from the target Placeholder's list and leave all other Placeholders' lists unchanged.
4. WHEN the user reorders Placeholder_Values via drag or move action, THE Template_Store SHALL persist the new order on the next localStorage write.
5. IF the user attempts to add a Placeholder_Value that is empty after trimming whitespace, THEN THE Template_Store SHALL reject the operation and display the message "候选值不能为空".
6. IF the user attempts to add a Placeholder_Value equal under string equality to a value already present in the same Placeholder's list, THEN THE Template_Store SHALL silently ignore the duplicate add request, leave the list unchanged, and indicate success to the caller.
7. WHEN a Template's Template_String is updated such that a Placeholder name is no longer referenced, THE Template_Store SHALL retain that Placeholder's value list and reuse the values when the same Placeholder name is later re-added to the same Template.

### Requirement 7: 通过选取候选值生成二维码

**User Story:** 作为用户，我希望从每个占位符的候选值列表中挑选值，使其代入模板后实时生成二维码。

#### Acceptance Criteria

1. WHEN every Placeholder of the active Template has a selected Placeholder_Value, THE Template_Renderer SHALL substitute each Placeholder_Token in the Template_String with the selected Placeholder_Value to produce the Final_String.
2. WHEN the active Template has zero Placeholders, THE Template_Renderer SHALL produce a Final_String equal to the Template_String with escaped braces decoded, and SHALL invoke the QR_Renderer with that Final_String.
3. WHEN the Final_String is produced, THE QR_Renderer SHALL render a QR code encoding the Final_String in the existing QrDisplay area.
4. WHILE the user changes any Placeholder selection, THE Template_Renderer SHALL update the Final_String and the rendered QR code within 200 ms of the selection change.
5. THE Placeholder_Editor SHALL display the Final_String as a read-only label adjacent to the QR code preview.
6. IF the active Template has at least one Placeholder without a selected Placeholder_Value, THEN THE Template_Renderer SHALL display the message "请为所有占位符选择候选值" and SHALL keep the QR code preview area empty.
7. IF a Placeholder of the active Template has zero candidate values in the Template_Store, THEN THE Template_Renderer SHALL display the message "请先为占位符 {name} 添加候选值" with `{name}` replaced by the actual Placeholder name and SHALL keep the QR code preview area empty.

### Requirement 8: 组合标签的保存与召回

**User Story:** 作为用户，我想把当前选好的占位符取值打标保存为组合标签，以便后续一键复用同一组取值生成二维码。

#### Acceptance Criteria

1. WHEN the user has selected a Placeholder_Value for every Placeholder of the active Template and supplies a non-empty Combination_Tag name, THE Template_Store SHALL persist a Combination_Tag containing the active Template's ID, the supplied tag name, the placeholder-to-value mapping, and the current timestamp as `createdAt`.
2. WHEN the user clicks a saved Combination_Tag of the active Template, THE Placeholder_Editor SHALL set each Placeholder selection to the value recorded in the Combination_Tag and SHALL invoke the Template_Renderer to regenerate the Final_String and QR code.
3. WHEN the user deletes a Combination_Tag, THE Template_Store SHALL remove only that Combination_Tag and leave the underlying Template, Placeholder_Value lists, and other Combination_Tags unchanged.
4. WHILE in Template_Mode, THE Placeholder_Editor SHALL display Combination_Tags for the active Template ordered by `createdAt` descending.
5. IF the user attempts to save a Combination_Tag whose name equals an existing Combination_Tag name under the same `templateId` (case-sensitive), THEN THE Template_Store SHALL prompt the user with a confirmation dialog containing the message "组合标签名称已存在，是否覆盖？"; on confirmation THE Template_Store SHALL replace the existing Combination_Tag's mapping and `createdAt` with the new values, and on cancellation THE Template_Store SHALL leave the existing Combination_Tag unchanged.
6. IF the user attempts to save a Combination_Tag while one or more Placeholders of the active Template have no selected Placeholder_Value, THEN THE Template_Store SHALL reject the operation and display the message "请先为所有占位符选择候选值".
7. IF a Combination_Tag stores a Placeholder_Value that is no longer present in the corresponding Placeholder's candidate list at recall time, THEN THE Template_Store SHALL re-add the missing value to the Placeholder's list at the end and complete the restoration.
8. IF a Combination_Tag references a Placeholder name that no longer exists in the active Template's Template_String, THEN THE Placeholder_Editor SHALL display the message "组合标签包含已失效的占位符" and SHALL apply the recall only to Placeholders still present in the current Template_String.

### Requirement 9: 模板与组合标签的导入导出

**User Story:** 作为用户，我希望导出和导入模板及组合标签 JSON 文件，以便备份与跨设备迁移配置。

#### Acceptance Criteria

1. WHEN the user clicks the export button in Template_Mode, THE Import_Export_Service SHALL produce a JSON file named `qrcode-templates-YYYY-MM-DD.json` containing all Templates, all Placeholder_Value lists, and all Combination_Tags from the Template_Store.
2. THE Import_Export_Service SHALL include a top-level integer field named `version` set to the current schema version in the exported JSON.
3. WHEN the user selects a JSON file for import, THE Import_Export_Service SHALL parse and validate the entire file against the export schema before applying any change to the Template_Store.
4. WHEN merging Templates, THE Import_Export_Service SHALL match by `id`; for matched Templates THE Import_Export_Service SHALL keep the Template whose `updatedAt` is greater, and SHALL keep the local Template when `updatedAt` values are equal.
5. WHEN merging Placeholder_Values for a Template, THE Import_Export_Service SHALL produce the union of local and imported values for each Placeholder, preserving the local order followed by imported values not previously present.
6. WHEN merging Combination_Tags, THE Import_Export_Service SHALL match by the pair `(templateId, name)`; for matched tags THE Import_Export_Service SHALL keep the Combination_Tag whose `createdAt` is greater; THE Import_Export_Service SHALL append imported tags whose pair has no local match.
7. THE Import_Export_Service SHALL report the count of newly added Templates, newly added Placeholder_Values, and newly added Combination_Tags after a successful import in a Chinese-language toast message.
8. IF the imported file contents fail JSON parsing, THEN THE Import_Export_Service SHALL display the message "文件内容不是有效的 JSON 格式" and SHALL preserve the existing Template_Store unchanged.
9. IF the imported file is valid JSON but its top-level shape does not conform to the export schema (missing `version`, or any of `templates`, `placeholderValues`, `combinationTags`), THEN THE Import_Export_Service SHALL display the message "文件格式不正确" and SHALL preserve the existing Template_Store unchanged.
10. IF the imported file's `version` is greater than the current schema version, THEN THE Import_Export_Service SHALL display the message "文件版本过新，请升级扩展后再导入" and SHALL preserve the existing Template_Store unchanged.

### Requirement 10: 边界条件与错误处理

**User Story:** 作为用户，我希望系统在异常输入或边界条件下给出明确反馈，避免数据丢失或误操作。

#### Acceptance Criteria

1. IF the localStorage value at `qrcode-template-store` exists but cannot be parsed as JSON during initialization, THEN THE Template_Store SHALL log the error to the console, treat the in-memory store as empty, and copy the original raw string to the localStorage key `qrcode-template-store.bak` before overwriting.
2. WHEN a Placeholder_Value contains characters that would otherwise have meta-meaning in a Template_String such as `{` or `}`, THE Template_Renderer SHALL substitute the value verbatim into the Final_String without re-running the Template_Parser on the substituted result.
3. WHEN the Final_String length exceeds 2953 characters, THE QR_Renderer SHALL display the warning "内容过长，二维码可能无法被识别" while still attempting to render the QR code.
4. WHEN the user switches from Template_Mode to Free_Mode, THE Popup_QR_Feature SHALL restore the Free_Mode UI state (text content, confirmation status, history selection) to the exact state before the mode switch.
5. WHEN the Template_Store updates state, THE Template_Store SHALL persist the entire snapshot under `qrcode-template-store` in a single localStorage write.
6. WHEN the user closes the browser and later reopens the popup on the same browser profile, THE Template_Store SHALL load the previously persisted snapshot from `qrcode-template-store` and restore the Template list, Placeholder_Value lists, and Combination_Tag list.

## Correctness Properties (for Property-Based Testing)

The following correctness properties cover pure logic in the QR Template Generator whose behavior varies meaningfully with input. They are candidates for property-based tests. UI flows, browser API wiring, and persistence side effects fall outside this list and are covered by example or integration tests.

### CP-1: Template Parser and Pretty Printer Round-Trip

For every well-formed segment list `S` (any sequence of literal fragments and Placeholder_Tokens whose names match `[A-Za-z0-9_-]+`), parsing the printed form SHALL reproduce `S` exactly.

```text
Template_Parser.parse(Template_Pretty_Printer.print(S)) ≡ S
```

Generator: arbitrary segment lists where literal fragments contain arbitrary Unicode text (with `{` and `}` escaped by the printer as `{{` and `}}`) and Placeholder_Tokens contain valid names.

### CP-2: Template_String to Segment List Round-Trip

For every Template_String `T` that the Template_Parser accepts without error, printing the parsed segment list SHALL reproduce `T` exactly.

```text
Template_Pretty_Printer.print(Template_Parser.parse(T)) ≡ T
```

Generator: arbitrary Template_Strings that mix literal text, escaped braces (`{{`, `}}`), and valid Placeholder_Tokens.

### CP-3: Substitution Fidelity

For every Template_String `T` accepted by the Template_Parser and every value map `m` that supplies a value for each Placeholder in `T`, the Final_String SHALL equal the concatenation of the parsed segment list with each Placeholder_Token replaced by `m[name]` and each escaped brace decoded to a single brace.

```text
Template_Renderer.render(T, m)
  ≡ concat(map(seg => seg.literal ? seg.text : m[seg.name], parse(T)))
```

Generator: arbitrary Template_Strings paired with value maps whose keys cover the parsed Placeholder name list.

### CP-4: Substitution Idempotence on Placeholder-Free Templates

For every Template_String `T` whose parsed segment list contains zero Placeholder_Tokens and any value map `m`, applying the Template_Renderer SHALL yield the same result as decoding escaped braces in `T`.

```text
render(T, m) ≡ unescape(T)   when T has no placeholders
```

### CP-5: Import and Export Round-Trip

For every Template_Store snapshot `S` that satisfies the store invariants (unique Template IDs, unique Template names, distinct values per Placeholder, unique `(templateId, tagName)` pairs), exporting `S` to JSON and importing the JSON into an empty store SHALL produce a snapshot equal to `S` under canonical normalization.

```text
import(export(S), emptyStore) ≡ normalize(S)
```

### CP-6: Merge Idempotence on Repeat Import

For every Template_Store snapshot `S` and every JSON file `J` produced by exporting any snapshot, importing `J` twice SHALL yield the same store as importing `J` once.

```text
import(J, import(J, S)) ≡ import(J, S)
```

### CP-7: Combination_Tag Recall Fidelity

For every Combination_Tag `t` saved against a Template with Template_String `T` and value map `m`, recalling `t` and re-rendering SHALL produce a Final_String equal to the Final_String captured at save time, provided `T` and the corresponding Placeholder candidate lists have not been mutated between save and recall.

```text
render(T, recall(t)) ≡ render(T, m)
```

### CP-8: Placeholder_Value Set Operations

For every Placeholder_Value list `L` and every value `v`:

```text
add(L, v)            preserves length when v ∈ L       (dedup)
add(add(L, v), v) ≡ add(L, v)                         (idempotence on add)
delete(L, v) ≡ L                  when v ∉ L           (no-op on absent)
add(delete(L, v), v) appends v at end                  (re-add goes to tail)
```

### CP-9: Isolation from Popup_QR_Feature

For every sequence of Template_Store operations, the value at localStorage key `qrcode-history` after the sequence SHALL equal the value at that key before the sequence.

Symmetrically, for every sequence of Popup_QR_Feature operations, the value at localStorage key `qrcode-template-store` after the sequence SHALL equal the value at that key before the sequence.
