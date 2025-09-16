# 🏗️ 架构文档

## 项目架构图

```mermaid
graph TB
    subgraph "前端层"
        n_test_files_TestComponent_vue_module["TestComponent.vue"]
        n_test_files_TestComponent_vue_imported_ref["ref"]
        n_test_files_TestComponent_vue_imported_computed["computed"]
        n_test_files_TestComponent_vue_imported_onMounted["onMounted"]
        n_test_files_TestComponent_vue_imported_useRouter["useRouter"]
        n_test_files_TestComponent_vue_imported_UserService["UserService"]
        n_test_files_TestComponent_vue_User["User"]
        n_test_files_TestComponent_vue_title["title"]
        n_test_files_TestComponent_vue_users["users"]
        n_test_files_TestComponent_vue_loading["loading"]
        n_test_files_TestComponent_vue_showModal["showModal"]
        n_test_files_TestComponent_vue_router["router"]
        n_test_files_TestComponent_vue_userService["userService"]
        n_test_files_TestComponent_vue_buttonText["buttonText"]
        n_test_files_TestComponent_vue_userCount["userCount"]
        n_test_files_TestComponent_vue_handleClick["handleClick"]
        n_test_files_TestComponent_vue_fetchUsers["fetchUsers"]
        n_test_files_TestComponent_vue_result["result"]
        n_test_files_TestComponent_vue_handleDeleteUser["handleDeleteUser"]
        n_test_files_TestComponent_vue_openModal["openModal"]
        n_test_files_TestComponent_vue_closeModal["closeModal"]
        n_test_files_TestComponent_vue_navigateToProfile["navigateToProfile"]
    end
    
    subgraph "服务层"
        
    end
    
    subgraph "配置层"
        n_test_files_config_json_json_root["root"]
    end
```

## 依赖关系图

```mermaid
graph LR
    sample_ts --> fs
    sample_ts --> n_Component
    Component --> n_Component_Component
    TestComponent_vue --> vue
    ref --> vue_ref
    computed --> vue_computed
    onMounted --> vue_onMounted
    TestComponent_vue --> vue_router
    useRouter --> vue_router_useRouter
    TestComponent_vue --> n_UserCard_vue
    TestComponent_vue --> n_services_UserService
    UserService --> n_services_UserService_UserService
```

## 架构层级说明

### 前端组件层
- **TestComponent.vue**: Module (TestComponent.vue)
- **ref**: Variable (TestComponent.vue)
- **computed**: Variable (TestComponent.vue)
- **onMounted**: Variable (TestComponent.vue)
- **useRouter**: Variable (TestComponent.vue)
- **UserService**: Variable (TestComponent.vue)
- **User**: Interface (TestComponent.vue)
- **title**: Variable (TestComponent.vue)
- **users**: Variable (TestComponent.vue)
- **loading**: Variable (TestComponent.vue)
- **showModal**: Variable (TestComponent.vue)
- **router**: Variable (TestComponent.vue)
- **userService**: Variable (TestComponent.vue)
- **buttonText**: Variable (TestComponent.vue)
- **userCount**: Variable (TestComponent.vue)
- **handleClick**: Variable (TestComponent.vue)
- **fetchUsers**: Variable (TestComponent.vue)
- **result**: Variable (TestComponent.vue)
- **handleDeleteUser**: Variable (TestComponent.vue)
- **openModal**: Variable (TestComponent.vue)
- **closeModal**: Variable (TestComponent.vue)
- **navigateToProfile**: Variable (TestComponent.vue)

### 服务逻辑层
- 暂无服务组件

### 配置管理层
- **root**: Json (config.json)
