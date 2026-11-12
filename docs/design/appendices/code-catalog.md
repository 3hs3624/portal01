# 코드·RPC·화면 계약 카탈로그

자동 추출 부록. 익명 콜백의 완전한 호출 그래프가 아니라 재구현 시 원문을 찾기 위한 색인입니다.

## RPC 및 DB 보조 함수

| 함수 | 인자(기본값 포함) | 반환 | 실행 권한 모델 | 최종 정의 근거 |
|---|---|---|---|---|
| portal_private.cleanup_logs | p_force boolean default false,p_actor uuid default null | jsonb | DEFINER | [supabase/migrations/20261103062619_log_retention.sql:24](../../../supabase/migrations/20261103062619_log_retention.sql#L24) |
| portal_private.has_permission | p_user uuid,p_permission text | boolean | DEFINER | [portal-admin.sql:62](../../../portal-admin.sql#L62) |
| portal_private.prevent_deleting_user_reactivation |  | trigger | DEFINER | [supabase/migrations/20261103062618_user_deletion.sql:43](../../../supabase/migrations/20261103062618_user_deletion.sql#L43) |
| portal_private.user_delete_check | p_actor uuid,p_user uuid | jsonb | DEFINER | [supabase/migrations/20261103062618_user_deletion.sql:10](../../../supabase/migrations/20261103062618_user_deletion.sql#L10) |
| portal_sharing.shared_action | p_action text,p_args jsonb | jsonb | DEFINER | [portal-item-sharing.sql:42](../../../portal-item-sharing.sql#L42) |
| portal_sharing.shared_validate | p_app text,w jsonb | void | INVOKER | [portal-item-sharing.sql:25](../../../portal-item-sharing.sql#L25) |
| public.portal_admin_change | p_action text,p_data jsonb | jsonb | DEFINER | [portal-admin-update.sql:1](../../../portal-admin-update.sql#L1) |
| public.portal_admin_delete_log | p_section text,p_id text | jsonb | DEFINER | [supabase/migrations/20261103062619_log_retention.sql:45](../../../supabase/migrations/20261103062619_log_retention.sql#L45) |
| public.portal_admin_read | p_section text,p_limit int default 50,p_offset int default 0,p_query text default '' | jsonb | DEFINER | [portal-admin.sql:94](../../../portal-admin.sql#L94) |
| public.portal_auth_context |  | jsonb | DEFINER | [portal-admin.sql:72](../../../portal-admin.sql#L72) |
| public.portal_bi_source | p_id text | jsonb | INVOKER | [portal-content-relational.sql:70](../../../portal-content-relational.sql#L70) |
| public.portal_can_access | p_app text,p_action text | boolean | DEFINER | [portal-admin.sql:82](../../../portal-admin.sql#L82) |
| public.portal_content_legacy_guard |  | trigger | INVOKER | [portal-content-relational.sql:182](../../../portal-content-relational.sql#L182) |
| public.portal_content_sync_properties |  | trigger | INVOKER | [portal-content-relational.sql:170](../../../portal-content-relational.sql#L170) |
| public.portal_content_touch |  | trigger | INVOKER | [portal-content-relational.sql:157](../../../portal-content-relational.sql#L157) |
| public.portal_content_workspace_get | p_app text | jsonb | INVOKER | [portal-content-relational.sql:75](../../../portal-content-relational.sql#L75) |
| public.portal_content_workspace_info | p_app text | jsonb | INVOKER | [portal-content-relational.sql:61](../../../portal-content-relational.sql#L61) |
| public.portal_content_workspace_save | p_app text,p_workspace jsonb,p_expected uuid default null | jsonb | INVOKER | [portal-content-relational.sql:94](../../../portal-content-relational.sql#L94) |
| public.portal_invite_finish | p_id uuid,p_user uuid,p_success boolean | jsonb | DEFINER | [supabase/migrations/202611030001_user_invitations.sql:25](../../../supabase/migrations/202611030001_user_invitations.sql#L25) |
| public.portal_invite_reserve | p_actor uuid,p_email text,p_name text | jsonb | DEFINER | [supabase/migrations/202611030001_user_invitations.sql:10](../../../supabase/migrations/202611030001_user_invitations.sql#L10) |
| public.portal_item_share | p_action text,p_args jsonb default '{}' | jsonb | INVOKER | [portal-item-sharing.sql:97](../../../portal-item-sharing.sql#L97) |
| public.portal_log_cleanup_now |  | jsonb | DEFINER | [supabase/migrations/20261103062619_log_retention.sql:39](../../../supabase/migrations/20261103062619_log_retention.sql#L39) |
| public.portal_log_settings | p_settings jsonb default null | jsonb | DEFINER | [supabase/migrations/20261103062619_log_retention.sql:10](../../../supabase/migrations/20261103062619_log_retention.sql#L10) |
| public.portal_pm_date | value text | date | INVOKER | [portal-projects-relational.sql:68](../../../portal-projects-relational.sql#L68) |
| public.portal_pm_legacy_guard |  | trigger | INVOKER | [portal-projects-relational.sql:158](../../../portal-projects-relational.sql#L158) |
| public.portal_pm_number | value text | numeric | INVOKER | [portal-projects-relational.sql:72](../../../portal-projects-relational.sql#L72) |
| public.portal_pm_state | p_project text | jsonb | INVOKER | [portal-projects-relational.sql:76](../../../portal-projects-relational.sql#L76) |
| public.portal_pm_sync_properties |  | trigger | INVOKER | [portal-projects-consistency.sql:3](../../../portal-projects-consistency.sql#L3) |
| public.portal_pm_time | value text | timestamptz | INVOKER | [portal-projects-relational.sql:70](../../../portal-projects-relational.sql#L70) |
| public.portal_pm_touch |  | trigger | INVOKER | [portal-projects-relational.sql:147](../../../portal-projects-relational.sql#L147) |
| public.portal_project_workspace_get |  | jsonb | INVOKER | [portal-projects-relational.sql:89](../../../portal-projects-relational.sql#L89) |
| public.portal_project_workspace_info |  | jsonb | INVOKER | [portal-projects-relational.sql:83](../../../portal-projects-relational.sql#L83) |
| public.portal_project_workspace_save | p_workspace jsonb,p_expected uuid default null | jsonb | INVOKER | [portal-projects-relational.sql:97](../../../portal-projects-relational.sql#L97) |
| public.portal_record_access | p_event text,p_id uuid,p_user_agent text default '' | boolean | DEFINER | [portal-admin.sql:85](../../../portal-admin.sql#L85) |
| public.portal_user_delete_finish | p_id uuid,p_success boolean | jsonb | DEFINER | [supabase/migrations/20261103062618_user_deletion.sql:53](../../../supabase/migrations/20261103062618_user_deletion.sql#L53) |
| public.portal_user_delete_preview | p_actor uuid,p_user uuid | jsonb | DEFINER | [supabase/migrations/20261103062618_user_deletion.sql:27](../../../supabase/migrations/20261103062618_user_deletion.sql#L27) |
| public.portal_user_delete_reserve | p_actor uuid,p_user uuid,p_email text | jsonb | DEFINER | [supabase/migrations/20261103062618_user_deletion.sql:29](../../../supabase/migrations/20261103062618_user_deletion.sql#L29) |
| public.portal_workspace_get | p_app text | jsonb | INVOKER | [portal-workspaces.sql:27](../../../portal-workspaces.sql#L27) |
| public.portal_workspace_save | p_app text,p_workspace jsonb,p_expected uuid default null | jsonb | INVOKER | [portal-content-relational.sql:185](../../../portal-content-relational.sql#L185) |

## UI 모듈별 선언 함수

| 모듈 | 선언 함수 |
|---|---|
| admin.js | actions, all, button, checkboxList, cleanupLogs, clear, create, deleteLog, dialog, editLogSettings, editRecord, field, load, mutate, removeRecord, row, status, table, toggleUser |
| app-shell.js | apply, current, icon, init, paint, setCollapsed, setupWorkspace |
| app.js | allowedApp, appFrameSource, appIcon, date, menuLink, node, openSettings, orderedModules, preferenceRecord, render, renderNavigation, route, setSidebarCollapsed, starIcon, syncAccess, toggleFavorite, updateOrderButtons, visibleModules |
| apps/insight/analysis-controls.js | refreshAnalysisControls, renderAnalysisStatus, renderTableCard |
| apps/insight/app.js | actionIcon, analysisCardConfig, analysisTable, api, applyAnalysisFilters, applySlicerRows, bindAnalysisClick, cardFiltered, changeSheet, connection, currentConfig, dateBucket, demo, download, draw, field, filterComparable, filtered, grouped, init, isDate, listActionButton, multiSeriesData, multiSeriesOption, notify, numeric, optionFor, profile, recommendations, refreshControls, renderAll, renderBoard, renderChart, resetAnalysisView, safeAnalysisConfig, safeCardFilters, safeSlicers, selectOptions, setData, showPage, tableChartOption, upload |
| apps/insight/board-studio.js | applyStudioSelection, canvasText, exportDashboard, initBoardStudio, initKpiEditor, kpiContent, kpiEditDraft, loadExportImage, makeBoardCanvas, openCardStudio, openKpiCreator, openKpiEditor, renderKpiEditPreview, withDefaultKpis |
| apps/insight/card-filters.js | cardFilterRules, changeSlicer, initCardAndSlicerFilters, previewCardFilters, renderCardFilterEditor, renderDashboardSlicers, setCardFilterRules |
| apps/insight/dashboard-library.js | commitDashboardMetadata, creationSourceEntry, dashboardLibraryEntries, filteredDashboardLibrary, initCreateSourceLookup, initDashboardLibrary, initRelinkDashboard, openCreateDashboard, openDashboardManagement, openLibraryDashboard, openRelinkDashboard, renderCreateSourceLookup, renderDashboardList |
| apps/insight/dashboards.js | applyPreset, applySavedDashboard, applyTileStyles, bindTileGesture, boardHistorySnapshot, buildPreset, createDashboardRecord, dashboardCompatibility, dashboardSnapshot, ensureBoardPositions, initBoardUndo, initDashboardEditor, initDashboards, openChartSourceRows, openDashboardSave, overlaps, previewTilePosition, proposeTilePositions, readDashboards, render, renderDashboardBoard, renderTemplatePicker, resetBoardHistory, safeConfig, saveDashboard, selectDashboardTemplate, setDashboardEditing, settlePositions, shouldUndoBoardEvent, snapshotSignature, syncEditMode, trackBoardHistory, undoBoardEdit, updateDashboardUI, updateUndoButton, validPosition, writeDashboards |
| apps/insight/data-catalog.js | cacheDatabase, catalogEntries, clearSelectedData, dashboardsForSelectedData, findDataRecord, findLinkedDashboard, initDataManagement, linkedDashboardNames, loadDetachedSnapshots, openDataDetail, openDeleteData, registerConnectedData, removeConnectedData, renderConnectedDataPicker, renderDataCatalog, renderDataLookup, retainedEntries, saveDetachedSnapshot, savedForSource, selectConnectedData, sourceMatches, trackDataDashboard |
| apps/insight/data-detail.js | button, cancelEditing, detailRows, downloadTableCSV, moveColumn, options, receive, refreshFilters, refreshValues, render, request, saveTable, syncEditing, tableChanged, tableDirty |
| apps/insight/data-editor-bridge.js | applyDetailTable, detailRevision, remapTableConfig |
| apps/insight/edit-session.js | beginDashboardSession, dashboardHasEdits, discardDashboardDraft, editSessionKey, editSessionSnapshot, finishDashboardExit, guardDashboardExit, persistDashboardDraft, restoreEditSnapshot |
| apps/insight/navigation-state.js | captureViewState, dashboardCompatibilityForView, rememberViewState, restoreViewState |
| apps/insight/storage-worker.js | 객체/IIFE/콜백; 원문 참조 |
| apps/insight/table-model.js | 객체/IIFE/콜백; 원문 참조 |
| apps/insight/workspace-storage.js | activeStorage, captureWorkspace, closeStorageProfile, editStorageProfile, hydrateStorageSource, initWorkspaceStorage, loadWorkspaceNow, openStorageProfile, renderStorageFields, renderStorageList, replaceDetachedStorage, restoreWorkspaceBundle, saveWorkspaceInWorker, saveWorkspaceNow, setStorageFormBusy, storageAPI, storageAction, storageChanged, storageSourceRecord, storageStatus, validateWorkspaceBundle |
| apps/markdown/app.js | applyEdit, captureWorkspace, changed, command, currentDoc, download, fileName, findMatches, findNext, importFiles, init, newRecord, onEditorInput, onError, openDraftDB, openFind, readDraft, renderDocList, renderEditor, renderMetadata, restoreWorkspace, safeAction, saveDraft, selectDocument, setFont, setView, toast, updateCursor, updateFindCount |
| apps/markdown/axis-drag.js | bind, clear, draw, locate, parts, preview, rows, studioTableViewport, tick |
| apps/markdown/block-recommendations.js | menu, read, recommend, record, recordBlockRecommendation |
| apps/markdown/block-ui.js | activateBlock, blockUIValid, closeBlockMenus, convertStudioBlock, copyBlockLink, currentStudioBlock, handleRichKey, menuButton, menuHeading, menuSearch, openAnnotations, openBlockMenu, openInsertMenu, openStudioAI, openStudioDialog, placeStudioMenu, renderInsertItems, restoreBlockLink, runSlash, selectBlockText, showColorMenu, showConvertMenu, showListMenu, showMoveMenu, showSkillsMenu, startBlockPresentation, studioDecodeAttribute, studioExtensions, studioNeedsHTML, studioNotes, studioParagraph, studioPatch, studioReplace, studioSerialize, submenu, updateBlockControls, updateSlashMenu |
| apps/markdown/block-widgets.js | chooseStudioDocument, chooseStudioSource, databaseFieldInput, editDatabaseRow, insertExtraInline, insertExtraNode, insertStudioExtra, newStudioDatabase, openStudioMediaPicker, renderStudioChart, renderStudioDatabase, renderStudioMath, renderStudioMedia, renderStudioMermaid, renderStudioWidget, safeStudioURL, studioEmbedURL, studioInlineEquationExtension, studioLoadScript, studioSVG, studioSourceOptions, studioWidgetExtensions, studioWidgetNode, updateStudioSource, widgetButton, widgetSummary |
| apps/markdown/column-resize.js | finish, hide, position |
| apps/markdown/database-charts.js | aggregate, config, controls, dateKey, download, render |
| apps/markdown/database-layout.js | clearRecordMark, controls, copyView, editField, icon, inlineCell, modeRecord, openRecord, refresh, render |
| apps/markdown/database-ui.js | addProperty, anchorFor, apply, button, close, decorateTable, enhance, guard, heading, icon, item, label, newRow, open, patch, position, resizeColumn, show, syncTitle |
| apps/markdown/database-views.js | applyRoute, configure, fields, filter, layout, normalize, render |
| apps/markdown/document-library.js | allTags, close, color, date, draw, editTags, editView, fileCount, label, modal, open, rows, sync, tagCell, titleCell |
| apps/markdown/document-tree.js | bindTreeDrag, bindTreeDrop, branch, folderPath, moveTreeRecord, openTreeItem, parentChoices, persistTreeUI, renderDocumentTree, selectFolder, selectTreeDocument, treeCompare, treeIcon, treeSelection, updateFolderToggle |
| apps/markdown/edit-history.js | historyBoundary, historyRecord, historySnapshot, recordEditHistory, resetEditHistory, restorePreviewSelection, runEditHistory, syncEditHistory, trimEditHistory |
| apps/markdown/editor-core.js | edit, matches, validate |
| apps/markdown/file-sync.js | applyFileMerge, bodyHash, checkFileChanges, createRecoveryBase, openFileConflicts, reconcileExternal, rememberFileBaseline, resolveFileConflicts, restoreRecoveryBase, showExternal |
| apps/markdown/folder-model.js | descendants, validate |
| apps/markdown/knowledge.js | openDocumentLink, references, renderDocumentChoices, renderKnowledge |
| apps/markdown/page-actions.js | close, commentLock, copy, drawMenu, insert, insertStudioPage, item, notify, open, openComments, pageURL, place, promote, render, show, syncComments, valid |
| apps/markdown/rich-editor.js | codeText, flushSourcePreview, onPreviewInput, previewCommand, previewHasFocus, previewMarkdown, syncPreviewEditable |
| apps/markdown/rich-v2.js | activeRichBlock, cloneRichBlock, engineRoot, ensureRichEditor, flushSourcePreview, focusRichEditor, indentRichBlock, moveRichBlock, mutateRichBlocks, onPreviewInput, previewCommand, previewHasFocus, previewMarkdown, renderRichDocument, richBlockAt, richBlockRect, richBlocks, richEngineActive, richExportHTML, richSanitize, richSiblingBlocks, richTopBlocks, serializeRichNode, signature, syncPreviewEditable, updateSelectionBubble, visit |
| apps/markdown/scroll-sync.js | applyDocumentViewOptions, defaultDocumentViewOptions, saveDocumentViewOptions, syncEditorScroll, updateScrollOptions |
| apps/markdown/storage-compare.js | compare, fingerprint, merge, path, summary |
| apps/markdown/storage-flow.js | busyEditor, capture, restore |
| apps/markdown/storage.js | activeStorage, initStorage, loadRemote, openProfile, profileFields, renderStorage, saveRemote, saveWorkspace, storageAPI, storageChanged, storageStatus |
| apps/markdown/table-grid.js | alignTableColumn, editEngineTable, engineTableContext, gridTSV, handleGridCopy, handleGridPaste, moveTableRow, parseTSV, replaceEngineTable, tableSort |
| apps/markdown/table-menu.js | cloneCell, close, commit, context, gridBounds, headerFlags, hideHandles, item, mutate, offsets, open, openPalette, place, refresh, render, resizeAxis, select, show, stopDrag, toggleHeader, valid |
| apps/markdown/table-tools.js | currentTableContext, editPreviewTable, editSelectedTable, editSourceTable, queueTableTools, selectedPreviewCell, sourceTableContext, tableLineCells, tableMarkdown, updateTableTools |
| apps/markdown/workspace-merge.js | items, merge |
| apps/projects/workbook-preserve.js | inspect, patchCell, patchSheet, path, preserve, strings, unpack |
| auth-link.js | 객체/IIFE/콜백; 원문 참조 |
| auth-session.js | 객체/IIFE/콜백; 원문 참조 |
| bridge.js | 객체/IIFE/콜백; 원문 참조 |
| cloud-files.js | bytes, capture, clean, directory, encode, fileHandle, hydrate, join, persist, validate, walk |
| cloud-ui.js | 객체/IIFE/콜백; 원문 참조 |
| content-cloud.js | call, create, failure, user, validate |
| excel.js | 객체/IIFE/콜백; 원문 참조 |
| folder-storage.js | directory, read, record, writeFile |
| item-sharing-adapters.js | capture, init, protect, wait |
| item-sharing.js | decorate, members, message, openItem, refresh, share, stamp, users |
| login.js | 객체/IIFE/콜백; 원문 참조 |
| pages-guard.js | detailHost |
| pages-runtime.js | csv, table, transact |
| project-cloud.js | asset, base64, bytes, check, create, error, hash, load, pack, path, rpc, templates, unpack, user, validate |
| shared-item.js | fail, itemTitle |
| sharing-cloud.js | create |
| sharing-frame.js | 객체/IIFE/콜백; 원문 참조 |
| sidebar-resize.js | apply, finish, notify, position, restore, save |
| storage-adapters.js | 객체/IIFE/콜백; 원문 참조 |
| storage-flow.js | api, apply, backupPair, backupView, backups, begin, busyEditor, capture, comparison, db, download, downloadBackup, field, freshTarget, header, importLegacy, main, markPending, open, putBackups, refresh, render, renderRows, restore, review, run, say, showBackups, summaryCard |
| storage-models.js | compare, encode, insightItems, projectItems, projectKey, semanticFile, summary |
| storage-status.js | paint |
| apps/projects/index.html (inline) | applyTheme, checkStore, closeForm, countStores, deleteProject, deleteStore, download, fileExists, fillWindow, filtered, getTemplate, init, legacyBackup, listMetas, load, loadExcel, metaFor, newId, noticeHTML, openConnect, openDashboard, openForm, openImport, openWindow, portalActivateCloudStore, readForm, readJSON, readProject, reconnect, relinkStore, render, renderAll, renderImport, renderStoreBox, renderStoreTab, rootOf, runImport, selectStore, setTab, showBlocked, snapDir, snapFile, status, storeErr, submitForm, unlinkStore, winFeatures, writeFile, writeMeta, writeProject |
| apps/projects/index.html#dash-tpl (inline) | addLoaded, agg, applyCellEdit, applySaved, applyStaged, applyTheme, bindCal, bindCompare, bindGantt, bindGuide, bindProj, bindStatic, bindVersions, bindWBS, boot, buildDocument, buildImport, buildWorkbook, changed, closeConflict, closeLoad, closeSamplePop, closeSave, commitExt, compareSources, compute, confirmHTML, conflictForce, conflictReload, cv, diffStates, diffTable, doDelete, doSave, downloadHTML, downloadJSON, exitExt, exitPreview, exportXlsx, findNode, findTask, flatTasks, gapState, gotoTask, hostInfo, hostNotify, keepFocus, leafCalc, leavesOf, listSnapFolder, loadExcel, loadFolderList, loadPicked, lockBasic, makeCal, move, normalize, offerFile, openConflict, openLoad, openSamplePop, openSave, parentArr, parseWorkbook, preservedBytes, readFile, readSnapFile, recompute, regroup, renderAll, renderBanner, renderCal, renderCompare, renderDashboard, renderDiff, renderGantt, renderImport, renderLoad, renderLoc, renderPreview, renderProj, renderSample, renderSaveTargets, renderSavebox, renderStoreChip, renderVersions, renderWBS, restoreVersion, rollup, rowHTML, safeJSON, savedTask, scrollToBase, setDepth, setSub, setView, snapFileName, storeInfo, storeSave, storeSnapList, summarize, syncBasicFromHost, taskPanelHTML, tipHTML, toDateStr, toPct, toPkg, toast, visibleRows |

## 블록 명령 코드 전체

| 코드 | 표시 이름 | 분류 | 구현 |
|---|---|---|---|
| ai | AI 블록 | 고급 블록 | apps/markdown/block-widgets.js |
| breadcrumb | 이동 경로 | 고급 블록 | apps/markdown/block-widgets.js |
| button | 버튼 | 고급 블록 | apps/markdown/block-widgets.js |
| columns2 | 2개의 열 | 고급 블록 | apps/markdown/block-widgets.js |
| columns3 | 3개의 열 | 고급 블록 | apps/markdown/block-widgets.js |
| columns4 | 4개의 열 | 고급 블록 | apps/markdown/block-widgets.js |
| columns5 | 5개의 열 | 고급 블록 | apps/markdown/block-widgets.js |
| equation | 수학 공식 블록 | 고급 블록 | apps/markdown/block-widgets.js |
| sync | 동기화 블록 | 고급 블록 | apps/markdown/block-widgets.js |
| tabs | 탭 | 고급 블록 | apps/markdown/block-widgets.js |
| toc | 목차 | 고급 블록 | apps/markdown/block-widgets.js |
| toggle1 | 토글 제목1 | 고급 블록 | apps/markdown/block-ui.js |
| toggle2 | 토글 제목2 | 고급 블록 | apps/markdown/block-widgets.js |
| bullet | 글머리 기호 목록 | 기본 블록 | apps/markdown/block-ui.js |
| callout | 콜아웃 | 기본 블록 | apps/markdown/block-ui.js |
| heading1 | 제목1 | 기본 블록 | apps/markdown/block-ui.js |
| heading2 | 제목2 | 기본 블록 | apps/markdown/block-ui.js |
| heading3 | 제목3 | 기본 블록 | apps/markdown/block-ui.js |
| heading4 | 제목4 | 기본 블록 | apps/markdown/block-ui.js |
| number | 번호 매기기 목록 | 기본 블록 | apps/markdown/block-ui.js |
| page | 페이지 | 기본 블록 | apps/markdown/block-ui.js |
| pageLink | 페이지 링크 | 기본 블록 | apps/markdown/block-widgets.js |
| paragraph | 텍스트 | 기본 블록 | apps/markdown/block-ui.js |
| quote | 인용 | 기본 블록 | apps/markdown/block-ui.js |
| rule | 구분선 | 기본 블록 | apps/markdown/block-ui.js |
| table | 표 | 기본 블록 | apps/markdown/block-ui.js |
| task | 할 일 목록 | 기본 블록 | apps/markdown/block-ui.js |
| toggle | 토글 목록 | 기본 블록 | apps/markdown/block-ui.js |
| chart-bar | 세로 막대 차트 | 데이터베이스 | apps/markdown/block-widgets.js |
| chart-donut | 도넛 차트 | 데이터베이스 | apps/markdown/block-widgets.js |
| chart-horizontal | 가로 막대 차트 | 데이터베이스 | apps/markdown/block-widgets.js |
| chart-line | 꺾은선 차트 | 데이터베이스 | apps/markdown/block-widgets.js |
| chart-number | 숫자 차트 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-board | 보드 보기 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-calendar | 캘린더 보기 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-dashboard | 대시보드 보기 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-feed | 피드 보기 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-form | 폼 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-gallery | 갤러리 보기 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-inline | 데이터베이스 - 인라인 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-list | 리스트 보기 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-map | 지도 보기 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-page | 데이터베이스 - 전체 페이지 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-source | 데이터 소스 보기 연결 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-table | 표 보기 | 데이터베이스 | apps/markdown/block-widgets.js |
| db-timeline | 타임라인 보기 | 데이터베이스 | apps/markdown/block-widgets.js |
| audio | 오디오 | 미디어 | apps/markdown/block-widgets.js |
| bookmark | 웹 북마크 | 미디어 | apps/markdown/block-widgets.js |
| fence | 코드 블록 | 미디어 | apps/markdown/block-ui.js |
| file | 파일 | 미디어 | apps/markdown/block-widgets.js |
| image | 이미지 | 미디어 | apps/markdown/block-ui.js |
| link | 링크 | 미디어 | apps/markdown/block-ui.js |
| video | 동영상 | 미디어 | apps/markdown/block-widgets.js |
| color-studioBackground-blue | 파란색 배경 | 배경 색상 | apps/markdown/block-widgets.js |
| color-studioBackground-brown | 갈색 배경 | 배경 색상 | apps/markdown/block-widgets.js |
| color-studioBackground-default | 기본 배경 | 배경 색상 | apps/markdown/block-widgets.js |
| color-studioBackground-gray | 회색 배경 | 배경 색상 | apps/markdown/block-widgets.js |
| color-studioBackground-green | 초록색 배경 | 배경 색상 | apps/markdown/block-widgets.js |
| color-studioBackground-orange | 주황색 배경 | 배경 색상 | apps/markdown/block-widgets.js |
| color-studioBackground-pink | 분홍색 배경 | 배경 색상 | apps/markdown/block-widgets.js |
| color-studioBackground-purple | 보라색 배경 | 배경 색상 | apps/markdown/block-widgets.js |
| color-studioBackground-red | 빨간색 배경 | 배경 색상 | apps/markdown/block-widgets.js |
| color-studioBackground-yellow | 노란색 배경 | 배경 색상 | apps/markdown/block-widgets.js |
| date | 날짜 또는 리마인더 | 인라인 | apps/markdown/block-widgets.js |
| emoji | 이모지 | 인라인 | apps/markdown/block-widgets.js |
| inlineEquation | 인라인 수학 공식 | 인라인 | apps/markdown/block-widgets.js |
| mention | 사용자 멘션하기 | 인라인 | apps/markdown/block-widgets.js |
| pageMention | 페이지나 데이터 소스 멘션 | 인라인 | apps/markdown/block-widgets.js |
| html | HTML | 임베드 | apps/markdown/block-widgets.js |
| service-Abstract | Abstract | 임베드 | apps/markdown/block-widgets.js |
| service-Figma | Figma | 임베드 | apps/markdown/block-widgets.js |
| service-Framer | Framer | 임베드 | apps/markdown/block-widgets.js |
| service-GitHub Gist | GitHub Gist | 임베드 | apps/markdown/block-widgets.js |
| service-Google Drive | Google Drive | 임베드 | apps/markdown/block-widgets.js |
| service-Google Maps | Google Maps | 임베드 | apps/markdown/block-widgets.js |
| service-Invision | Invision | 임베드 | apps/markdown/block-widgets.js |
| service-Miro | Miro | 임베드 | apps/markdown/block-widgets.js |
| service-Mixpanel | Mixpanel | 임베드 | apps/markdown/block-widgets.js |
| service-Sketch | Sketch | 임베드 | apps/markdown/block-widgets.js |
| service-Whimsical | Whimsical | 임베드 | apps/markdown/block-widgets.js |
| urlEmbed | 임베드 | 임베드 | apps/markdown/block-widgets.js |
| action-ai | AI에게 질문하기 | 작업 | apps/markdown/block-widgets.js |
| action-copy | 블록 링크 복사 | 작업 | apps/markdown/block-widgets.js |
| action-delete | 삭제 | 작업 | apps/markdown/block-widgets.js |
| action-duplicate | 복제 | 작업 | apps/markdown/block-widgets.js |
| action-move | 옮기기 | 작업 | apps/markdown/block-widgets.js |
| action-present | 여기에서 발표 | 작업 | apps/markdown/block-widgets.js |
| embed | HTML · 임베드 | 추천 | apps/markdown/block-ui.js |
| mermaid | 코드 - Mermaid | 추천 | apps/markdown/block-widgets.js |
| note | AI 노트 | 추천 | apps/markdown/block-ui.js |
| toggle3 | 토글 제목3 | 추천 | apps/markdown/block-ui.js |
| color-studioColor-blue | 파란색 텍스트 | 텍스트 색상 | apps/markdown/block-widgets.js |
| color-studioColor-brown | 갈색 텍스트 | 텍스트 색상 | apps/markdown/block-widgets.js |
| color-studioColor-default | 기본 텍스트 | 텍스트 색상 | apps/markdown/block-widgets.js |
| color-studioColor-gray | 회색 텍스트 | 텍스트 색상 | apps/markdown/block-widgets.js |
| color-studioColor-green | 초록색 텍스트 | 텍스트 색상 | apps/markdown/block-widgets.js |
| color-studioColor-orange | 주황색 텍스트 | 텍스트 색상 | apps/markdown/block-widgets.js |
| color-studioColor-pink | 분홍색 텍스트 | 텍스트 색상 | apps/markdown/block-widgets.js |
| color-studioColor-purple | 보라색 텍스트 | 텍스트 색상 | apps/markdown/block-widgets.js |
| color-studioColor-red | 빨간색 텍스트 | 텍스트 색상 | apps/markdown/block-widgets.js |
| color-studioColor-yellow | 노란색 텍스트 | 텍스트 색상 | apps/markdown/block-widgets.js |
