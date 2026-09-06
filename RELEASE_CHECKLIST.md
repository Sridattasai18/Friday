# Release Checklist for npm v2.0.0

## ✅ Pre-Publishing Steps

### 1. Version & Documentation
- [x] Updated version in `package.json` (1.0.1 → 2.0.0)
- [x] Updated version badge in `README.md`
- [x] Updated features list in `README.md`
- [x] Updated commands table in `README.md`
- [x] Updated screenshots paths in `README.md`
- [x] Updated roadmap in `README.md`
- [x] Created `CHANGELOG.md` with v2.0.0 changes

### 2. Code Quality
- [ ] Run local tests: `npm start` and verify all features work
- [ ] Test new commands:
  - [ ] `/start <task>` - marks as in-progress
  - [ ] `/update <id> <new title>` - edits title
  - [ ] `/list done` - filters completed
  - [ ] `/list in-progress` - filters working tasks
  - [ ] `/list pending` - filters pending
  - [ ] `/list todo` - shows pending + in-progress
- [ ] Verify UI displays correctly:
  - [ ] Status labels (TODO/DOING/DONE/SKIP)
  - [ ] Timestamps ("2h ago", "3d ago")
  - [ ] Colors and icons
  - [ ] Vertical separators (│)

### 3. Git & GitHub
- [ ] Commit all changes: `git add . && git commit -m "Release v2.0.0: Task tracker enhancements"`
- [ ] Create git tag: `git tag v2.0.0`
- [ ] Push to GitHub: `git push origin main --tags`
- [ ] Create GitHub release with CHANGELOG notes

### 4. npm Files Check
- [ ] Verify `package.json` "files" array includes all necessary files:
  ```json
  "files": [
    "bin/",
    "src/app.jsx",
    "src/Onboarding.jsx",
    "core/"
  ]
  ```
- [ ] Check `.npmignore` excludes unnecessary files
- [ ] Preview package contents: `npm pack --dry-run`

### 5. npm Publishing
- [ ] Login to npm: `npm login`
- [ ] Publish: `npm publish`
- [ ] Verify on npm: https://www.npmjs.com/package/@sridattasai_v/friday
- [ ] Test global install: `npm install -g @sridattasai_v/friday@2.0.0`

---

## 🚀 Publishing Commands

```bash
# 1. Final test
npm start

# 2. Commit and tag
git add .
git commit -m "Release v2.0.0: Task tracker enhancements"
git tag v2.0.0
git push origin main --tags

# 3. Preview package
npm pack --dry-run

# 4. Publish to npm
npm login
npm publish

# 5. Test installation
npm install -g @sridattasai_v/friday@2.0.0
friday
```

---

## 📝 Release Notes Template (for GitHub)

```markdown
## F.R.I.D.A.Y v2.0.0 - Task Tracker Enhancements

### 🎨 New UI Design
- Color-coded status system (TODO/DOING/DONE/SKIP)
- Relative timestamps for all tasks and habits
- High-contrast layout with vertical separators

### ✨ New Features
- **In-Progress Status**: Use `/start` to mark tasks you're working on
- **Update Command**: Use `/update <id> <new title>` to edit tasks
- **Status Filters**: Filter by done, pending, in-progress, todo, or skipped
- **Timestamp Tracking**: See when tasks were last updated

### 🔧 Technical Improvements
- Added `updatedAt` field to all tasks/habits
- New data model supporting `in-progress` status
- Enhanced personality responses for new actions
- Improved command autocomplete

### 📦 Install
```bash
npm install -g @sridattasai_v/friday@2.0.0
```

### 🐛 Breaking Changes
- UI icons changed from circles (○●◌) to text labels (TODO/DOING/DONE)
- Old screenshots replaced with new design

See full [CHANGELOG.md](./CHANGELOG.md) for details.
```

---

## 🔍 Post-Publishing Verification

- [ ] Check npm page: https://www.npmjs.com/package/@sridattasai_v/friday
- [ ] Verify version shows 2.0.0
- [ ] Verify README renders correctly on npm
- [ ] Test fresh install on another machine
- [ ] Update social media / dev.to / personal site with announcement

---

## ⚠️ If Something Goes Wrong

### Unpublish (within 72 hours)
```bash
npm unpublish @sridattasai_v/friday@2.0.0
```

### Publish patch version
```bash
# Fix issues, then:
npm version patch  # bumps to 2.0.1
npm publish
```

### Deprecate version
```bash
npm deprecate @sridattasai_v/friday@2.0.0 "Use v2.0.1 instead"
```
