// WeComAgentConfirmSDK.h
// 企业微信 WeClaw 二次确认弹窗 SDK（发送端）对外纯 C 接口。
// macOS / Windows 共用此头文件，接口签名一致；平台差异在实现内部屏蔽。
//
// Windows 实现：
//   - 进程间通信使用 WM_COPYDATA
//   - JSON 组包使用 base::json::JsonBuilder / rapidjson
//   - 调用线程必须包含标准 Win32 消息循环（GetMessage / DispatchMessage），
//     否则 RequestPanel 等 IPC 请求无法收到企微侧的同步回包
//
// 接口约定：
//   - 所有接口非线程安全，必须在同一线程内调用
//   - 字符串均为 UTF-8、\0 结尾
//   - 无业务结果回调：用户在企微侧的 confirm/cancel/dismiss 操作结果由企微自身 CGI 处理，
//     SDK 不回传给接入方

#pragma once

// ---------------------------------------------------------------------------
// 动态库导出宏
// ---------------------------------------------------------------------------
#ifdef _WIN32
    #ifdef WECOMAGENTCONFIRMSDK_EXPORTS
        #define WECOM_AGENT_CONFIRM_SDK_API __declspec(dllexport)
    #else
        #define WECOM_AGENT_CONFIRM_SDK_API __declspec(dllimport)
    #endif
#else
    #define WECOM_AGENT_CONFIRM_SDK_API __attribute__((visibility("default")))
#endif

#include <stdbool.h>

// ---------------------------------------------------------------------------
// 错误码
// ---------------------------------------------------------------------------
#define WECOM_SDK_OK                  0    // 成功
#define WECOM_SDK_ERR_NOT_INITIALIZED -1   // SDK 未初始化
#define WECOM_SDK_ERR_ALREADY_INIT    -2   // SDK 重复初始化
#define WECOM_SDK_ERR_INVALID_PARAM   -3   // 参数无效
#define WECOM_SDK_ERR_REGISTER_CLASS  -4   // 注册窗口类失败
#define WECOM_SDK_ERR_CREATE_WINDOW   -5   // 创建窗口失败
#define WECOM_SDK_ERR_NO_RECEIVER     -6   // 企微接收端窗口不存在（企微未运行）
#define WECOM_SDK_ERR_SEND_TIMEOUT    -7   // 发送超时

#ifdef __cplusplus
extern "C" {
#endif

// 1. 初始化 SDK：全局只需调用一次；重复调用返回失败。必须在调用其他接口前调用。
//    app_version : SDK 版本号（UTF-8）
//    返回 0 成功，非 0 失败：
//      WECOM_SDK_ERR_ALREADY_INIT   重复初始化
//      WECOM_SDK_ERR_REGISTER_CLASS 注册窗口类失败
//      WECOM_SDK_ERR_CREATE_WINDOW  创建窗口失败
WECOM_AGENT_CONFIRM_SDK_API int Initialize(const char *app_version);

// 2. 反初始化 SDK：释放资源、销毁内部消息窗口。与 Initialize 配对调用。
WECOM_AGENT_CONFIRM_SDK_API void Uninitialize(void);

// 3. 请求二次确认弹窗（跟随企业微信主题）。返回 0 成功（请求已发送），非 0 失败。
//    签名保持不变，等价于 RequestPanelWithColorScheme(..., NULL)。
//    cli_error_tokens  : 客户端错误 token 数组，同时作为本次确认会话的标识
//    count             : cli_error_tokens 元素个数
//    pos_x / pos_y     : 窗口中心点坐标（屏幕坐标，整数，左上原点）
//                        传 (0,0) 时企微侧兜底主屏居中
//    失败码：
//      WECOM_SDK_ERR_NOT_INITIALIZED SDK 未初始化
//      WECOM_SDK_ERR_INVALID_PARAM   参数无效（count<=0 或 tokens=null）
//      WECOM_SDK_ERR_NO_RECEIVER     企微接收端窗口不存在（企微未运行）
//      WECOM_SDK_ERR_SEND_TIMEOUT    发送超时
WECOM_AGENT_CONFIRM_SDK_API int RequestPanel(const char *cli_error_tokens[],
                                             int count,
                                             int pos_x,
                                             int pos_y);

// 4. 企业微信是否存活。返回 true 存活，false 未存活。
WECOM_AGENT_CONFIRM_SDK_API bool IsWXWorkAlive(void);

// 5. 获取企业微信版本号（UTF-8、\0 结尾，如 "4.1.30.6012"）。
//    实现方式：从注册表查找安装目录，读取 wxwork.exe 的文件版本号。
//    不依赖企微进程是否运行；任何失败情况（注册表未找到 / 文件不存在 /
//    读取版本失败）均返回空字符串 ""。
//    返回字符串所有权归 SDK，调用方不得释放；如需保留请立即深拷贝。
WECOM_AGENT_CONFIRM_SDK_API const char *GetWXWorkVersion(void);

// 6. 关闭窗口：仅关闭 cli_error_tokens 对应的窗口，不发送 CGI、不更新 handled_keys_。
//    cli_error_tokens : 需关闭的确认卡片 token 数组
//    count            : cli_error_tokens 元素个数
//    返回 0 成功（请求已发送），非 0 失败。
WECOM_AGENT_CONFIRM_SDK_API int ClosePanel(const char *cli_error_tokens[],
                                           int count);

// 7. 显示窗口：显示 cli_error_tokens 对应的窗口。
//    cli_error_tokens : 需显示的确认卡片 token 数组
//    count            : cli_error_tokens 元素个数
//    返回 0 成功（请求已发送），非 0 失败。
WECOM_AGENT_CONFIRM_SDK_API int ShowPanel(const char *cli_error_tokens[],
                                          int count);

// 8. 隐藏窗口：隐藏 cli_error_tokens 对应的窗口。
//    cli_error_tokens : 需隐藏的确认卡片 token 数组
//    count            : cli_error_tokens 元素个数
//    返回 0 成功（请求已发送），非 0 失败。
WECOM_AGENT_CONFIRM_SDK_API int HidePanel(const char *cli_error_tokens[],
                                          int count);

// 9. 请求二次确认弹窗，并指定弹窗配色。返回 0 成功（请求已发送），非 0 失败。
//    cli_error_tokens / count / pos_x / pos_y : 同 RequestPanel（失败码亦同）
//    color_scheme : 弹窗配色，"dark" / "light"（UTF-8、\0 结尾）；
//                   传 NULL / 空串 / 其他值表示跟随企业微信主题
//    接口名与签名与 macOS 侧一致。
WECOM_AGENT_CONFIRM_SDK_API int RequestPanelWithColorScheme(const char *cli_error_tokens[],
                                                            int count,
                                                            int pos_x,
                                                            int pos_y,
                                                            const char *color_scheme);

#ifdef __cplusplus
}
#endif
